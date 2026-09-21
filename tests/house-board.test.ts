/**
 * The house board is the seat record, ranked.
 *
 * Coin has to come from the same day buckets a seat uses. A board that
 * invents a second total is a lie the player can catch by opening their seat.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { hueEarned } from "@/lib/coin";
import {
  daysInWeek,
  rankHouseBoard,
  rankHouseBoardWeek,
  showHeaderBoard,
  standingFromDays,
  type BoardPlayer,
  type DayBucket,
} from "@/lib/house-board";
import { DAY_MS, lifetimeTaskBonus, weekIndex } from "@/lib/tasks";

function bucketsToWindows(days: DayBucket[]) {
  const byDay = new Map<number, { clicks: number; takes: number }>();
  const byWeek = new Map<number, { clicks: number; takes: number }>();
  for (const row of days) {
    const counts = { clicks: row.clicks, takes: row.takes };
    const day = byDay.get(row.day) ?? { clicks: 0, takes: 0 };
    day.clicks += counts.clicks;
    day.takes += counts.takes;
    byDay.set(row.day, day);
    const w = weekIndex(row.day * DAY_MS);
    const week = byWeek.get(w) ?? { clicks: 0, takes: 0 };
    week.clicks += counts.clicks;
    week.takes += counts.takes;
    byWeek.set(w, week);
  }
  return { days: [...byDay.values()], weeks: [...byWeek.values()] };
}

test("board coin equals seat coin for the same buckets", () => {
  const days: DayBucket[] = [
    { day: 20000, clicks: 1, takes: 0, takenCents: 0 },
    { day: 20001, clicks: 10, takes: 1, takenCents: 395 },
  ];
  const standing = standingFromDays(days);
  const windows = bucketsToWindows(days);
  const bonus = lifetimeTaskBonus(windows);
  const clicks = days.reduce((sum, row) => sum + row.clicks, 0);
  const takes = days.reduce((sum, row) => sum + row.takes, 0);
  assert.equal(standing.clicks, clicks);
  assert.equal(standing.takes, takes);
  assert.equal(standing.taken, 3.95);
  assert.equal(standing.bonus, bonus);
  assert.equal(standing.coin, hueEarned({ clicks, takes, bonus }));
});

test("higher HUE sits above more takes", () => {
  const players: BoardPlayer[] = [
    { username: "azure", days: [{ day: 20000, clicks: 1, takes: 2, takenCents: 600 }] },
    {
      username: "volt",
      days: [
        { day: 20000, clicks: 10, takes: 0 },
        { day: 20001, clicks: 10, takes: 0 },
        { day: 20002, clicks: 10, takes: 0 },
      ],
    },
  ];
  const board = rankHouseBoard(players);
  assert.equal(board[0]?.username, "volt");
  assert.ok((board[0]?.coin ?? 0) > (board[1]?.coin ?? 0));
  assert.ok((board[0]?.takes ?? 1) < (board[1]?.takes ?? 0));
  assert.equal(board[0]?.place, 1);
  assert.equal(board[1]?.place, 2);
});

test("same HUE, more takes ranks first", () => {
  const players: BoardPlayer[] = [
    { username: "amber", days: [{ day: 20000, clicks: 15, takes: 0 }] },
    { username: "crimson", days: [{ day: 20000, clicks: 0, takes: 1, takenCents: 100 }] },
  ];
  const board = rankHouseBoard(players);
  assert.equal(board[0]?.username, "crimson");
  assert.equal(board[0]?.coin, board[1]?.coin);
  assert.ok((board[0]?.takes ?? 0) > (board[1]?.takes ?? 0));
});

test("tied marks share a place", () => {
  const players: BoardPlayer[] = [
    { username: "azure", days: [{ day: 20000, clicks: 1, takes: 0 }] },
    { username: "volt", days: [{ day: 20000, clicks: 1, takes: 0 }] },
    { username: "amber", days: [{ day: 20000, clicks: 10, takes: 0 }] },
  ];
  const board = rankHouseBoard(players);
  assert.equal(board[0]?.username, "amber");
  assert.equal(board[1]?.place, 2);
  assert.equal(board[2]?.place, 2);
  assert.equal(board[1]?.username, "azure");
  assert.equal(board[2]?.username, "volt");
});

test("a seat that never sat is not on the board", () => {
  const board = rankHouseBoard([
    { username: "ghost", days: [] },
    { username: "", days: [{ day: 20000, clicks: 4, takes: 0 }] },
  ]);
  assert.equal(board.length, 0);
});

test("the board caps at forty seats", () => {
  const players: BoardPlayer[] = Array.from({ length: 45 }, (_, index) => ({
    username: `seat${String(index).padStart(2, "0")}`,
    days: [{ day: 20000, clicks: 45 - index, takes: 0 }],
  }));
  const board = rankHouseBoard(players, 40);
  assert.equal(board.length, 40);
  assert.equal(board[0]?.username, "seat00");
});

test("this week uses the same standing math on a UTC-week slice", () => {
  const monday = Date.UTC(2026, 8, 14, 12, 0, 0);
  const thisWeekDay = Math.floor(monday / DAY_MS);
  const lastWeekDay = thisWeekDay - 7;
  const days: DayBucket[] = [
    { day: lastWeekDay, clicks: 20, takes: 2, takenCents: 800 },
    { day: thisWeekDay, clicks: 4, takes: 1, takenCents: 200 },
  ];
  const weekDays = daysInWeek(days, monday);
  assert.equal(weekDays.length, 1);
  assert.equal(weekDays[0]?.clicks, 4);
  const weekStanding = standingFromDays(weekDays);
  const players: BoardPlayer[] = [
    { username: "volt", days },
    { username: "ghost", days: [{ day: lastWeekDay, clicks: 50, takes: 0 }] },
  ];
  const week = rankHouseBoardWeek(players, monday);
  assert.equal(week.length, 1);
  assert.equal(week[0]?.username, "volt");
  assert.equal(week[0]?.coin, weekStanding.coin);
  assert.equal(week[0]?.takes, 1);
});

test("the lintel names the board off that page", () => {
  assert.equal(showHeaderBoard("/news"), true);
  assert.equal(showHeaderBoard("/"), true);
  assert.equal(showHeaderBoard("/board"), false);
  assert.equal(showHeaderBoard("/board?ref=x"), false);
});
