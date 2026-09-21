import { COLORS } from "./colors";
import { prisma } from "./db";
import {
  HOUSE_BOARD_LIMIT,
  rankHouseBoard,
  rankHouseBoardWeek,
  standingFromDays,
  type BoardPlayer,
  type HouseSeat,
} from "./house-board";
import { fromCents } from "./money";
import {
  DAY_MS,
  dailyProgress,
  dayIndex,
  weekIndex,
  weeklyProgress,
  type TaskProgress,
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
        since: string | null;
      }[]
    >(
      `SELECT
         SUM(CASE WHEN type = 'payout' THEN 1 ELSE 0 END) AS takes,
         SUM(CASE WHEN type = 'payout' THEN amount ELSE 0 END) AS takenCents,
         MAX(CASE WHEN type = 'payout' THEN amount ELSE 0 END) AS biggestCents,
         SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END) AS clicks,
         CAST(MIN(CASE WHEN type = 'click' THEN createdAt ELSE NULL END) AS TEXT) AS since
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

    const standing = standingFromDays(
      buckets.map((row) => ({
        day: Number(row.day),
        clicks: num(row.clicks),
        takes: num(row.takes),
      })),
    );

    const now = Date.now();
    const todayBucket = buckets.find((row) => Number(row.day) === dayIndex(now));
    const today = {
      clicks: num(todayBucket?.clicks),
      takes: num(todayBucket?.takes),
    };
    const thisWeek = buckets.reduce(
      (week, row) => {
        if (weekIndex(Number(row.day) * DAY_MS) !== weekIndex(now)) return week;
        week.clicks += num(row.clicks);
        week.takes += num(row.takes);
        return week;
      },
      { clicks: 0, takes: 0 },
    );

    return {
      takes,
      taken: fromCents(num(totals?.takenCents)),
      biggest: fromCents(num(totals?.biggestCents)),
      clicks,
      hue,
      since: totals?.since == null ? null : Number(totals.since),
      coin: standing.coin,
      bonus: standing.bonus,
      daily: dailyProgress(today),
      weekly: weeklyProgress(thisWeek),
    };
  } catch {
    return emptyRecord();
  }
}

async function loadBoardPlayers(): Promise<BoardPlayer[]> {
  const rows = await prisma.$queryRawUnsafe<
    {
      playerId: string;
      username: string;
      day: number | bigint;
      clicks: number | null;
      takes: number | null;
      takenCents: number | null;
    }[]
  >(
    `SELECT t.playerId AS playerId,
            u.username AS username,
            CAST(t.createdAt / ${DAY_MS} AS INTEGER) AS day,
            SUM(CASE WHEN t.type = 'click' THEN 1 ELSE 0 END) AS clicks,
            SUM(CASE WHEN t.type = 'payout' THEN 1 ELSE 0 END) AS takes,
            SUM(CASE WHEN t.type = 'payout' THEN t.amount ELSE 0 END) AS takenCents
       FROM Tx t
       JOIN User u ON u.id = t.playerId
      WHERE t.type IN ('click', 'payout')
      GROUP BY t.playerId, u.username, day`,
  );
  const byPlayer = new Map<string, BoardPlayer>();
  for (const row of rows) {
    const username = (row.username || "").trim();
    if (!username) continue;
    const player = byPlayer.get(row.playerId) ?? { username, days: [] };
    player.days.push({
      day: Number(row.day),
      clicks: num(row.clicks),
      takes: num(row.takes),
      takenCents: num(row.takenCents),
    });
    byPlayer.set(row.playerId, player);
  }
  return [...byPlayer.values()];
}

/**
 * Every seat that has clicked, ranked by the same HUE as the seat record.
 * Cap is small on purpose — this is a book, not a crawl of the user table.
 */
export async function listHouseBoard(limit = HOUSE_BOARD_LIMIT): Promise<HouseSeat[]> {
  try {
    return rankHouseBoard(await loadBoardPlayers(), limit);
  } catch {
    return [];
  }
}

/** Same seats, same HUE math, this UTC week only. */
export async function listHouseBoardWeek(
  limit = HOUSE_BOARD_LIMIT,
  at = Date.now(),
): Promise<HouseSeat[]> {
  try {
    return rankHouseBoardWeek(await loadBoardPlayers(), at, limit);
  } catch {
    return [];
  }
}
