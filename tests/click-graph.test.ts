import test from "node:test";
import assert from "node:assert/strict";
import {
  axisTicks,
  elapsed01,
  graphScale,
  holdScale,
  holdTotals,
  niceMax,
  playheadAt,
  pushSample,
  readRoundClock,
  remainingOf,
  stacksForColor,
  syncRoundClock,
  timeBarPct,
  withLiveTip,
} from "@/lib/click-graph";
import { emptyColorCounts } from "@/lib/colors";
import type { PublicSeat } from "@/lib/types";

function seat(
  username: string,
  clicks: Partial<PublicSeat["clicks"]>,
  you = false,
): PublicSeat {
  return {
    userId: username,
    username,
    avatar: "",
    you,
    balance: 0,
    totalClicks: 0,
    spent: 0,
    clicks: { ...emptyColorCounts(), ...clicks },
    estimated: 0,
  };
}

test("time bar shrinks with remaining time", () => {
  assert.equal(timeBarPct(30_000, 60_000), 50);
  assert.equal(timeBarPct(0, 60_000), 0);
  assert.equal(timeBarPct(90_000, 60_000), 100);
  assert.equal(timeBarPct(10, 0), 100);
});

test("graph stacks accounts on a color", () => {
  const seats = [
    seat("bill", { crimson: 3 }),
    seat("ana", { crimson: 5, azure: 1 }, true),
    seat("zed", { azure: 2 }),
  ];
  const crimson = stacksForColor(seats, "crimson");
  assert.deepEqual(
    crimson.map((row) => row.username),
    ["ana", "bill"],
  );
  assert.equal(crimson[0].clicks, 5);
  assert.equal(stacksForColor(seats, "volt").length, 0);
});

test("fog keeps only your stacks", () => {
  const seats = [
    seat("bill", { crimson: 3 }),
    seat("ana", { crimson: 5 }, true),
  ];
  const fog = stacksForColor(seats, "crimson", true);
  assert.equal(fog.length, 1);
  assert.equal(fog[0].username, "ana");
});

test("scale follows the leading color", () => {
  assert.equal(graphScale({ crimson: 4, azure: 9 }, ["crimson", "azure"]), 9);
  assert.equal(graphScale({ crimson: 0 }, ["crimson"]), 1);
});

test("elapsed time is the inverse of the shrinking bar", () => {
  assert.equal(elapsed01(15_000, 60_000), 0.75);
  assert.equal(niceMax(3), 5);
  assert.equal(niceMax(9), 10);
});

test("series keeps a live tip and resets if time runs backward", () => {
  const ids = ["crimson"];
  let series = pushSample([], { t: 0.2, totals: { crimson: 1 } }, ids);
  series = pushSample(series, { t: 0.2, totals: { crimson: 1 } }, ids);
  assert.equal(series.length, 1);
  series = pushSample(series, { t: 0.4, totals: { crimson: 3 } }, ids);
  assert.equal(series.length, 3);
  assert.equal(series[1].totals.crimson, 1);
  assert.equal(series[2].totals.crimson, 3);
  series = pushSample(series, { t: 0.399, totals: { crimson: 3 } }, ids);
  assert.equal(series.length, 3);
  series = pushSample(series, { t: 0.1, totals: { crimson: 0 } }, ids);
  assert.equal(series[0].t, 0.1);
  const live = withLiveTip(series, 0.5, { crimson: 3 });
  assert.equal(live[0].t, 0);
  assert.equal(live[0].totals.crimson, 0);
  assert.equal(live[live.length - 1].t, 0.5);
  assert.equal(live[live.length - 1].totals.crimson, 3);
});

test("playhead follows wall time and the scale only grows", () => {
  assert.equal(playheadAt(1_000, 1_000, 5_000), 0);
  assert.equal(playheadAt(5_000, 1_000, 5_000), 1);
  assert.equal(playheadAt(3_000, 1_000, 5_000), 0.5);
  assert.equal(remainingOf(3_000, 5_000), 2_000);
  assert.equal(holdScale(1, 3), 5);
  assert.equal(holdScale(5, 2), 5);
  assert.deepEqual(axisTicks(1), [0, 1]);
  assert.deepEqual(axisTicks(3), [0, 1, 2, 3]);
});

test("the graph clock interpolates and only corrects a real jump", () => {
  const clock = syncRoundClock(
    { perf: 1000, remaining: 20_000, duration: 60_000 },
    19_920,
    60_000,
    1080,
  );
  assert.equal(clock.remaining, 20_000);
  assert.equal(readRoundClock(clock, 1080).left, 19_920);
  const jumped = syncRoundClock(clock, 8_000, 60_000, 1100);
  assert.equal(jumped.remaining, 8_000);
  const next = syncRoundClock(clock, 20_000, 15_000, 1100);
  assert.equal(next.duration, 15_000);
});

test("fog holds the last clear totals", () => {
  const live = { crimson: 0, azure: 0 };
  const held = { crimson: 4, azure: 2 };
  assert.deepEqual(holdTotals(live, held, true), held);
  assert.deepEqual(holdTotals(live, held, false), live);
});
