import { hueEarned } from "./coin";
import { COLORS } from "./colors";
import { prisma } from "./db";
import { fromCents } from "./money";
import {
  DAY_MS,
  dailyProgress,
  dayIndex,
  lifetimeTaskBonus,
  weekIndex,
  weeklyProgress,
  type TaskProgress,
  type WindowCounts,
} from "./tasks";

/**
 * A seat's public betting record.
 *
 * Only ever wins and activity. Takes are already public — the room feed
 * announces them and every take has a shareable page — so surfacing them
 * here reveals nothing new. Balance, net position and losses stay private
 * and must not be added.
 */
export type PlayerRecord = {
  takes: number;
  taken: number;
  biggest: number;
  clicks: number;
  hue: string;
  since: number | null;
  /** HUE, the house coin. Earned from play, derived — never stored. */
  coin: number;
  /** Task bonus HUE earned across every past day and week. */
  bonus: number;
  daily: TaskProgress[];
  weekly: TaskProgress[];
};

export const emptyRecord = (): PlayerRecord => ({
  takes: 0,
  taken: 0,
  biggest: 0,
  clicks: 0,
  hue: "",
  since: null,
  coin: 0,
  bonus: 0,
  daily: dailyProgress({ clicks: 0, takes: 0 }),
  weekly: weeklyProgress({ clicks: 0, takes: 0 }),
});

function num(value: unknown) {
  if (value == null) return 0;
  return Number(value) || 0;
}

export async function playerRecord(userId: string): Promise<PlayerRecord> {
  if (!userId) return emptyRecord();

  // Click notes are written as `Clicked <Hue> in <Room> #<n>`, so the hue a
  // seat favours is countable without a separate column.
  const hueSums = COLORS.map(
    (color) =>
      `SUM(CASE WHEN note LIKE 'Clicked ${color.name} in%' THEN 1 ELSE 0 END) AS ${color.id}`,
  ).join(", ");

  try {
    const [totals] = await prisma.$queryRawUnsafe<
      {
        takes: number | null;
        takenCents: number | null;
        biggestCents: number | null;
        clicks: number | null;
        since: number | bigint | null;
      }[]
    >(
      `SELECT
         SUM(CASE WHEN type = 'payout' THEN 1 ELSE 0 END) AS takes,
         SUM(CASE WHEN type = 'payout' THEN amount ELSE 0 END) AS takenCents,
         MAX(CASE WHEN type = 'payout' THEN amount ELSE 0 END) AS biggestCents,
         SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END) AS clicks,
         MIN(CASE WHEN type = 'click' THEN createdAt ELSE NULL END) AS since
       FROM Tx WHERE playerId = ?`,
      userId,
    );

    const [hues] = await prisma.$queryRawUnsafe<Record<string, number | null>[]>(
      `SELECT ${hueSums} FROM Tx WHERE playerId = ? AND type = 'click'`,
      userId,
    );

    let hue = "";
    let best = 0;
    for (const color of COLORS) {
      const count = num(hues?.[color.id]);
      if (count > best) {
        best = count;
        hue = color.name;
      }
    }

    const takes = num(totals?.takes);
    const clicks = num(totals?.clicks);

    // Bucket play by UTC day and Monday-start week so task bonuses can be
    // summed over all history instead of only the window a player is in.
    const buckets = await prisma.$queryRawUnsafe<
      { day: number | bigint; clicks: number | null; takes: number | null }[]
    >(
      `SELECT CAST(createdAt / ${DAY_MS} AS INTEGER) AS day,
              SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END) AS clicks,
              SUM(CASE WHEN type = 'payout' THEN 1 ELSE 0 END) AS takes
         FROM Tx
        WHERE playerId = ? AND type IN ('click', 'payout')
        GROUP BY day`,
      userId,
    );

    const byDay = new Map<number, WindowCounts>();
    const byWeek = new Map<number, WindowCounts>();
    for (const row of buckets) {
      const d = Number(row.day);
      const counts = { clicks: num(row.clicks), takes: num(row.takes) };
      byDay.set(d, counts);
      const w = weekIndex(d * DAY_MS);
      const week = byWeek.get(w) ?? { clicks: 0, takes: 0 };
      week.clicks += counts.clicks;
      week.takes += counts.takes;
      byWeek.set(w, week);
    }

    const now = Date.now();
    const today = byDay.get(dayIndex(now)) ?? { clicks: 0, takes: 0 };
    const thisWeek = byWeek.get(weekIndex(now)) ?? { clicks: 0, takes: 0 };
    const bonus = lifetimeTaskBonus({
      days: [...byDay.values()],
      weeks: [...byWeek.values()],
    });

    return {
      takes,
      taken: fromCents(num(totals?.takenCents)),
      biggest: fromCents(num(totals?.biggestCents)),
      clicks,
      hue,
      since: totals?.since == null ? null : Number(totals.since),
      coin: hueEarned({ clicks, takes, bonus }),
      bonus,
      daily: dailyProgress(today),
      weekly: weeklyProgress(thisWeek),
    };
  } catch {
    return emptyRecord();
  }
}
