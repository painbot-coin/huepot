import test from "node:test";
import assert from "node:assert/strict";
import { AIM_N, aimGap, flickAim, newAim, stepAim } from "@/lib/aim";
import { AIM_FEATURE_COUNT, aimFeatures, pickAimMove, scoreAimMove, stepAimHouse, trainAim } from "@/lib/aim-ai";
import { AIM_DEEP_WEIGHTS, AIM_FIRST_WEIGHTS } from "@/lib/aim-weights";

function rng() {
  return 0.4;
}

test("a flick on the mark scores", () => {
  const start = newAim(rng);
  const hit = flickAim(start, start.target, rng);
  assert.equal(hit.score, start.score + 1);
  assert.equal(hit.misses, start.misses);
});

test("a flick off the mark misses", () => {
  const start = newAim(rng);
  const miss = flickAim(start, (start.target + 1) % (AIM_N * AIM_N), rng);
  assert.equal(miss.score, start.score);
  assert.equal(miss.misses, start.misses + 1);
});

test("a deep aim sit moves toward the mark", () => {
  const start = { ...newAim(rng), cursor: 0, target: AIM_N * AIM_N - 1, time: 12 };
  const before = aimGap(start);
  const next = stepAimHouse(start, AIM_DEEP_WEIGHTS, rng);
  assert.ok(aimGap(next) <= before);
  assert.equal(pickAimMove(start, AIM_FIRST_WEIGHTS) !== undefined, true);
});

test("looking one flick ahead can beat a one-step sit", () => {
  const start = { ...newAim(rng), cursor: 0, target: AIM_N * AIM_N - 1, time: 12, alive: true };
  const one = pickAimMove(start, AIM_DEEP_WEIGHTS, 1);
  const two = pickAimMove(start, AIM_DEEP_WEIGHTS, 2);
  const s1 = scoreAimMove(start, one, AIM_DEEP_WEIGHTS, 2);
  const s2 = scoreAimMove(start, two, AIM_DEEP_WEIGHTS, 2);
  assert.ok(s2 + 1e-9 >= s1);
  assert.notEqual(scoreAimMove(start, 1, AIM_DEEP_WEIGHTS, 1), scoreAimMove(start, 1, AIM_DEEP_WEIGHTS, 2));
});

test("a house aim sit keeps four weights and finishes", () => {
  const result = trainAim(AIM_FIRST_WEIGHTS, 9, 24);
  assert.equal(result.weights.length, 4);
  assert.ok(result.steps > 0);
  assert.ok(result.weights.every((w) => Number.isFinite(w)));
});

test("an aim lesson keeps four weights", () => {
  assert.equal(AIM_FEATURE_COUNT, 4);
  assert.equal(aimFeatures(newAim(rng)).length, 4);
  assert.equal(AIM_FIRST_WEIGHTS.length, 4);
  const stay = stepAim(newAim(rng), 4, rng);
  assert.ok(stay.time <= 12);
});
