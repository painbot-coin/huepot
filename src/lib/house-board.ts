/**
 * The house board.
 *
 * A seat already has a record. This is the same standing, ranked across the
 * house. Coin is derived the same way `playerRecord` derives it — play plus
 * lifetime task bonus — so a row here cannot disagree with that seat.
 *
 * Wins and activity only. Balance, net and losses stay off this list.
 */

import { hueEarned, levelFor } from "@/lib/coin";
import { fromCents } from "@/lib/money";
import {
  DAY_MS,
  lifetimeTaskBonus,
  weekIndex,
  type WindowCounts,
} from "@/lib/tasks";

export const HOUSE_BOARD_LIMIT = 40;

export type DayBucket = {
  day: number;
  clicks: number;
  takes: number;
  takenCents?: number;
};

export type BoardPlayer = {
  username: string;
  days: DayBucket[];
};

export type HouseStanding = {
  clicks: number;
  takes: number;
  taken: number;
  bonus: number;
  coin: number;
};

export type HouseSeat = {
  place: number;
  username: string;
  coin: number;
  bonus: number;
  clicks: number;
  takes: number;
  taken: number;
  level: number;
  title: string;
};

function num(value: unknown) {
  if (value == null) return 0;
  return Number(value) || 0;
}

/** UTC-week slice of the same day buckets a seat uses. Not a second ranking. */
export function daysInWeek(days: DayBucket[], at = Date.now()): DayBucket[] {
  const week = weekIndex(at);
  return days.filter((row) => weekIndex(Number(row.day) * DAY_MS) === week);
}

/** Standing for one seat from UTC day buckets. Same math as the seat record. */
export function standingFromDays(days: DayBucket[]): HouseStanding {
  const byDay = new Map<number, WindowCounts>();
  const byWeek = new Map<number, WindowCounts>();
  let clicks = 0;
  let takes = 0;
  let takenCents = 0;
  for (const row of days) {
    const d = Number(row.day);
    const counts = { clicks: num(row.clicks), takes: num(row.takes) };
    const day = byDay.get(d) ?? { clicks: 0, takes: 0 };
    day.clicks += counts.clicks;
    day.takes += counts.takes;
    byDay.set(d, day);
    const w = weekIndex(d * DAY_MS);
    const week = byWeek.get(w) ?? { clicks: 0, takes: 0 };
    week.clicks += counts.clicks;
    week.takes += counts.takes;
    byWeek.set(w, week);
    clicks += counts.clicks;
    takes += counts.takes;
    takenCents += num(row.takenCents);
  }
  const bonus = lifetimeTaskBonus({
    days: [...byDay.values()],
    weeks: [...byWeek.values()],
  });
  return {
    clicks,
    takes,
    taken: fromCents(takenCents),
    bonus,
    coin: hueEarned({ clicks, takes, bonus }),
  };
}

function seatOf(player: BoardPlayer): HouseSeat | null {
  const name = player.username.trim();
  if (!name) return null;
  const standing = standingFromDays(player.days);
  if (standing.clicks < 1 && standing.takes < 1) return null;
  const level = levelFor(standing.coin);
  return {
    place: 0,
    username: name,
    coin: standing.coin,
    bonus: standing.bonus,
    clicks: standing.clicks,
    takes: standing.takes,
    taken: standing.taken,
    level: level.level,
    title: level.title,
  };
}

function sameMark(a: HouseSeat, b: HouseSeat) {
  return a.coin === b.coin && a.takes === b.takes;
}

/** Rank seats by HUE, then takes. Tied marks share a place. */
export function rankHouseBoardWeek(
  players: BoardPlayer[],
  at = Date.now(),
  limit = HOUSE_BOARD_LIMIT,
): HouseSeat[] {
  return rankHouseBoard(
    players.map((player) => ({ ...player, days: daysInWeek(player.days, at) })),
    limit,
  );
}

export function rankHouseBoard(
  players: BoardPlayer[],
  limit = HOUSE_BOARD_LIMIT,
): HouseSeat[] {
  const cap = Math.max(1, Math.min(HOUSE_BOARD_LIMIT, Math.floor(limit) || HOUSE_BOARD_LIMIT));
  const seats = players
    .map(seatOf)
    .filter((seat): seat is HouseSeat => Boolean(seat))
    .sort((a, b) => {
      if (b.coin !== a.coin) return b.coin - a.coin;
      if (b.takes !== a.takes) return b.takes - a.takes;
      return a.username.localeCompare(b.username);
    })
    .slice(0, cap);
  let lastPlace = 0;
  return seats.map((seat, index) => {
    const place =
      index > 0 && sameMark(seat, seats[index - 1]!) ? lastPlace : index + 1;
    lastPlace = place;
    return { ...seat, place };
  });
}

export function showHeaderBoard(path: string) {
  return path !== "/board" && !path.startsWith("/board?");
}
