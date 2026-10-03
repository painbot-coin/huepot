import test from "node:test";
import assert from "node:assert/strict";
import { covers, newCatch, stepCatch } from "@/lib/catch";
import { pickCatchMove, scoreCatchMove, trainCatch } from "@/lib/catch-ai";
import { CATCH_DEEP_WEIGHTS, CATCH_FIRST_WEIGHTS } from "@/lib/catch-weights";
import { newSnake, stepSnake } from "@/lib/snake";
import { pickSnakeTurn, scoreSnakeTurn, snakeFeatures, trainSnake } from "@/lib/snake-ai";
import { SNAKE_DEEP_WEIGHTS } from "@/lib/snake-weights";
import { deepenLab, seedLab } from "@/lib/lab-stack";

const rng = () => 0.4;

test("a catch paddle can cover a token", () => {
  let state = newCatch(rng);
  state = { ...state, paddle: 3, tokenX: 4, tokenY: 10 };
  assert.equal(covers(state), true);
  const next = stepCatch(state, 0, rng);
  assert.ok(next.score >= state.score);
});

test("a deep catch sit moves toward the token", () => {
  const right = { ...newCatch(rng), paddle: 0, tokenX: 8, tokenY: 3, alive: true };
  assert.equal(pickCatchMove(right, CATCH_DEEP_WEIGHTS), 1);
  const left = { ...newCatch(rng), paddle: 8, tokenX: 0, tokenY: 3, alive: true };
  assert.equal(pickCatchMove(left, CATCH_DEEP_WEIGHTS), -1);
});

test("a snake dies on a wall and grows on food", () => {
  const start = newSnake(rng);
  const hit = stepSnake({ ...start, body: [0], dir: 3 }, 0, rng);
  assert.equal(hit.alive, false);
  const ahead = start.body[0]! + (start.dir === 0 ? -10 : start.dir === 1 ? 1 : start.dir === 2 ? 10 : -1);
  const eat = stepSnake({ ...start, food: ahead, dir: start.dir }, 0, rng);
  assert.ok(eat.score >= start.score);
});

test("a deep snake sit turns off a wall and keeps eating", () => {
  const start = newSnake(rng);
  const against = { ...start, body: [1, 2, 3], dir: 3 as const, alive: true };
  const turn = pickSnakeTurn(against, SNAKE_DEEP_WEIGHTS);
  const next = stepSnake(against, turn, rng);
  assert.equal(next.alive, true);
  assert.equal(snakeFeatures(against).length, 6);
  let state = start;
  let steps = 0;
  while (state.alive && steps < 250) {
    state = stepSnake(state, pickSnakeTurn(state, SNAKE_DEEP_WEIGHTS), rng);
    steps += 1;
  }
  assert.equal(state.alive, true);
  assert.ok(state.score >= 8);
});

test("looking one catch step ahead can beat a one-step sit", () => {
  const state = { ...newCatch(rng), paddle: 5, tokenX: 0, tokenY: 9, alive: true };
  const one = pickCatchMove(state, CATCH_DEEP_WEIGHTS, 1);
  const two = pickCatchMove(state, CATCH_DEEP_WEIGHTS, 2);
  const s1 = scoreCatchMove(state, one, CATCH_DEEP_WEIGHTS, 2);
  const s2 = scoreCatchMove(state, two, CATCH_DEEP_WEIGHTS, 2);
  assert.ok(s2 + 1e-9 >= s1);
  assert.notEqual(scoreCatchMove(state, 0, CATCH_DEEP_WEIGHTS, 1), scoreCatchMove(state, 0, CATCH_DEEP_WEIGHTS, 2));
});

test("a house catch sit keeps six weights and finishes", () => {
  const result = trainCatch(CATCH_FIRST_WEIGHTS, 21, 40);
  assert.equal(result.weights.length, 6);
  assert.ok(result.steps > 0);
  assert.ok(result.steps <= 40);
  assert.ok(result.weights.every((w) => Number.isFinite(w)));
});

test("a house snake sit keeps six weights and finishes", () => {
  const result = trainSnake(SNAKE_DEEP_WEIGHTS, 11, 40);
  assert.equal(result.weights.length, 6);
  assert.ok(result.steps > 0);
  assert.ok(result.weights.every((w) => Number.isFinite(w)));
});

test("a human lock sits a short house game on the live book", () => {
  const start = seedLab().catch;
  const next = deepenLab(start, "catch", 7, 20);
  assert.ok(next.pieces > start.pieces);
  assert.equal(next.weights.length, 6);
  assert.ok(next.bestScore >= start.bestScore);
});

test("looking one snake turn ahead can beat a one-step sit", () => {
  const start = newSnake(rng);
  const against = { ...start, body: [1, 2, 3], dir: 3 as const, alive: true };
  const one = pickSnakeTurn(against, SNAKE_DEEP_WEIGHTS, 1);
  const two = pickSnakeTurn(against, SNAKE_DEEP_WEIGHTS, 2);
  const s1 = scoreSnakeTurn(against, one, SNAKE_DEEP_WEIGHTS, 2);
  const s2 = scoreSnakeTurn(against, two, SNAKE_DEEP_WEIGHTS, 2);
  assert.ok(s2 + 1e-9 >= s1);
  assert.notEqual(scoreSnakeTurn(against, 0, SNAKE_DEEP_WEIGHTS, 1), scoreSnakeTurn(against, 0, SNAKE_DEEP_WEIGHTS, 2));
});
