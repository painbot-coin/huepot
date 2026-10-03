import assert from "node:assert/strict";
import test from "node:test";
import { AIM_DEEP_WEIGHTS, AIM_FIRST_WEIGHTS } from "@/lib/aim-weights";
import { BREAK_DEEP_WEIGHTS, BREAK_FIRST_WEIGHTS } from "@/lib/break-weights";
import { CATCH_DEEP_WEIGHTS, CATCH_FIRST_WEIGHTS } from "@/lib/catch-weights";
import { LANE_DEEP_WEIGHTS, LANE_FIRST_WEIGHTS } from "@/lib/lane-weights";
import { SNAKE_DEEP_WEIGHTS, SNAKE_FIRST_WEIGHTS } from "@/lib/snake-weights";
import {
  LAB_DEEP_GAMES,
  LAB_FIRST_GAMES,
  LAB_SEED_WEIGHTS,
  keepHeldSit,
  labSitHolds,
  trainLabBook,
} from "@/lib/lab-train";
import { HOUSE_MARKS } from "@/lib/house-mark-list";

const GAMES = ["catch", "snake", "aim", "lane", "break"] as const;

test("a short house sit keeps each book's feature count", () => {
  for (const game of GAMES) {
    const start = LAB_SEED_WEIGHTS[game];
    const result = trainLabBook(game, start, 3, 11, 16);
    assert.equal(result.weights.length, start.length);
    assert.equal(result.games, 3);
    assert.ok(result.steps > 0);
    assert.ok(result.weights.every((w) => Number.isFinite(w)));
    assert.ok(result.weights.every((w) => w >= -25 && w <= 25));
  }
});

test("a human lock that misses a hold keeps the book that played", () => {
  assert.equal(labSitHolds("catch", CATCH_DEEP_WEIGHTS), true);
  const broken = [0, 0, 0, 8, 0, 0];
  assert.equal(labSitHolds("catch", broken), false);
  const kept = keepHeldSit("catch", CATCH_DEEP_WEIGHTS, broken);
  assert.deepEqual(
    kept,
    CATCH_DEEP_WEIGHTS.map((w) => Math.round(w * 1000) / 1000),
  );
  assert.deepEqual(keepHeldSit("catch", broken, CATCH_DEEP_WEIGHTS), keepHeldSit("catch", CATCH_DEEP_WEIGHTS, CATCH_DEEP_WEIGHTS));
});

test("first and deep files are trained sits, not the hand start", () => {
  assert.equal(LAB_FIRST_GAMES, 80);
  assert.equal(LAB_DEEP_GAMES, 160);
  assert.notDeepEqual(CATCH_FIRST_WEIGHTS, LAB_SEED_WEIGHTS.catch);
  assert.notDeepEqual(CATCH_DEEP_WEIGHTS, CATCH_FIRST_WEIGHTS);
  assert.notDeepEqual(SNAKE_FIRST_WEIGHTS, LAB_SEED_WEIGHTS.snake);
  assert.notDeepEqual(AIM_FIRST_WEIGHTS, LAB_SEED_WEIGHTS.aim);
  assert.notDeepEqual(LANE_FIRST_WEIGHTS, LAB_SEED_WEIGHTS.lane);
  assert.notDeepEqual(BREAK_FIRST_WEIGHTS, LAB_SEED_WEIGHTS.break);
  assert.equal(AIM_DEEP_WEIGHTS.length, 4);
  assert.equal(LANE_DEEP_WEIGHTS.length, 4);
  assert.equal(BREAK_DEEP_WEIGHTS.length, 4);
  assert.equal(SNAKE_DEEP_WEIGHTS.length, 6);
  assert.equal(labSitHolds("catch", CATCH_DEEP_WEIGHTS), true);
  assert.equal(labSitHolds("snake", SNAKE_DEEP_WEIGHTS), true);
  assert.equal(labSitHolds("aim", AIM_DEEP_WEIGHTS), true);
  assert.equal(labSitHolds("lane", LANE_DEEP_WEIGHTS), true);
  assert.equal(labSitHolds("break", BREAK_DEEP_WEIGHTS), true);
  for (const id of [
    "catch-first",
    "catch-deep",
    "snake-first",
    "snake-deep",
    "aim-first",
    "aim-deep",
    "lane-first",
    "lane-deep",
    "break-first",
    "break-deep",
  ]) {
    const mark = HOUSE_MARKS.find((row) => row.id === id);
    assert.ok(mark);
    assert.doesNotMatch(mark.how, /look-ahead/);
  }
});
