import test from "node:test";
import assert from "node:assert/strict";
import { BREAK_BRICKS, BREAK_COLS, brickOn, breakPadGap, covers, fullWall, newBreak, stepBreak } from "@/lib/break";
import { stepBreakHouse } from "@/lib/break-ai";
import { labRng } from "@/lib/lab-rng";
import { BREAK_FEATURE_COUNT, breakFeatures, pickBreakMove, scoreBreakMove, trainBreak } from "@/lib/break-ai";
import { BREAK_DEEP_WEIGHTS, BREAK_FIRST_WEIGHTS } from "@/lib/break-weights";

function rng() {
  return 0.4;
}

test("a pad bounce keeps the gold up and a miss counts", () => {
  const start = { ...newBreak(rng), paddle: 3, ballX: 3, ballY: 8, vx: 1 as const, vy: 1 as const, alive: true };
  assert.equal(covers(start), true);
  const hit = stepBreak(start, 0, rng);
  assert.equal(hit.vy, -1);
  assert.ok(hit.ballY < 9);
  const miss = stepBreak({ ...start, paddle: 0, ballX: 6 }, 0, rng);
  assert.equal(miss.misses, start.misses + 1);
});

test("a brick hit scores and clears that cell", () => {
  const wall = fullWall();
  assert.equal(brickOn(wall, 2, 1), true);
  const start = { ...newBreak(rng), ballX: 3, ballY: 2, vx: -1 as const, vy: -1 as const, bricks: wall };
  const next = stepBreak(start, 0, rng);
  assert.equal(next.score, start.score + 1);
  assert.equal(brickOn(next.bricks, 2, 1), false);
});

test("a cleared wall serves the next ball on the pad", () => {
  const only = 1 << (1 * BREAK_COLS + 7);
  const start = { ...newBreak(rng), bricks: only, ballX: 6, ballY: 2, vx: 1 as const, vy: -1 as const, score: 23, paddle: 3 };
  const next = stepBreak(start, 0, rng);
  assert.equal(next.score, BREAK_BRICKS);
  assert.equal(next.bricks, fullWall());
  assert.equal(next.alive, true);
  assert.equal(breakPadGap(next), 0);
});

test("a miss serves the next ball with the pad already under it", () => {
  const start = { ...newBreak(rng), paddle: 0, ballX: 6, ballY: 8, vx: 1 as const, vy: 1 as const, alive: true };
  const miss = stepBreak(start, 0, rng);
  assert.equal(miss.misses, start.misses + 1);
  assert.equal(miss.alive, true);
  assert.equal(breakPadGap(miss), 0);
});

test("a return aims at the brick that is still up", () => {
  const landing = { ...newBreak(rng), paddle: 5, ballX: 4, ballY: 8, vx: 1 as const, vy: 1 as const, alive: true };
  assert.equal(pickBreakMove({ ...landing, bricks: 1 << 3 }, BREAK_DEEP_WEIGHTS), 0);
  assert.equal(pickBreakMove({ ...landing, bricks: 1 << 1 }, BREAK_DEEP_WEIGHTS), -1);
});

test("a deep break sit clears a wall and stays alive", () => {
  const rngPlay = labRng(4000);
  let state = newBreak(rngPlay);
  let steps = 0;
  while (state.alive && state.score < BREAK_BRICKS && steps < 400) {
    state = stepBreakHouse(state, BREAK_DEEP_WEIGHTS, rngPlay);
    steps += 1;
  }
  assert.equal(state.alive, true);
  assert.ok(state.score >= BREAK_BRICKS);
  assert.equal(breakPadGap(state), 0);
});

test("a deep break sit slides toward the gold", () => {
  const right = { ...newBreak(rng), paddle: 0, ballX: 5, ballY: 8, vx: 1 as const, vy: 1 as const, alive: true };
  assert.equal(pickBreakMove(right, BREAK_DEEP_WEIGHTS), 1);
  const left = { ...newBreak(rng), paddle: 6, ballX: 1, ballY: 8, vx: -1 as const, vy: 1 as const, alive: true };
  assert.equal(pickBreakMove(left, BREAK_DEEP_WEIGHTS), -1);
});

test("looking one bounce ahead can beat a one-step sit", () => {
  const state = { ...newBreak(rng), paddle: 3, ballX: 5, ballY: 7, vx: 1 as const, vy: 1 as const, alive: true };
  const one = pickBreakMove(state, BREAK_DEEP_WEIGHTS, 1);
  const two = pickBreakMove(state, BREAK_DEEP_WEIGHTS, 2);
  const s1 = scoreBreakMove(state, one, BREAK_DEEP_WEIGHTS, 2);
  const s2 = scoreBreakMove(state, two, BREAK_DEEP_WEIGHTS, 2);
  assert.ok(s2 + 1e-9 >= s1);
  assert.notEqual(scoreBreakMove(state, 0, BREAK_DEEP_WEIGHTS, 1), scoreBreakMove(state, 0, BREAK_DEEP_WEIGHTS, 2));
});

test("a house break sit keeps four weights and finishes", () => {
  const result = trainBreak(BREAK_FIRST_WEIGHTS, 13, 24);
  assert.equal(result.weights.length, 4);
  assert.ok(result.steps > 0);
  assert.ok(result.weights.every((w) => Number.isFinite(w)));
});

test("a break lesson keeps four weights", () => {
  assert.equal(BREAK_FEATURE_COUNT, 4);
  assert.equal(breakFeatures(newBreak(rng)).length, 4);
  assert.equal(BREAK_FIRST_WEIGHTS.length, 4);
});
