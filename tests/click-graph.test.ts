import test from "node:test";
import assert from "node:assert/strict";
import {
  elapsed01,
  graphScale,
  holdTotals,
  niceMax,
  pushSample,
  stacksForColor,
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
  assert.equal(series.length, 2);
  series = pushSample(series, { t: 0.1, totals: { crimson: 0 } }, ids);
  assert.equal(series[0].t, 0.1);
  const live = withLiveTip(series, 0.5, { crimson: 3 });
  assert.equal(live[0].t, 0);
  assert.equal(live[0].totals.crimson, 0);
  assert.equal(live[live.length - 1].t, 0.5);
  assert.equal(live[live.length - 1].totals.crimson, 3);
});

test("fog holds the last clear totals", () => {
  const live = { crimson: 0, azure: 0 };
  const held = { crimson: 4, azure: 2 };
  assert.deepEqual(holdTotals(live, held, true), held);
  assert.deepEqual(holdTotals(live, held, false), live);
});
