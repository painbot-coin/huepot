import test from "node:test";
import assert from "node:assert/strict";
import { canLastHit, newLane, peekLane, stepLane, strikeLane } from "@/lib/lane";
import { LANE_FEATURE_COUNT, laneFeatures, pickLaneStrike, scoreLaneStrike, stepLaneHouse, trainLane } from "@/lib/lane-ai";
import { LANE_DEEP_WEIGHTS, LANE_FIRST_WEIGHTS } from "@/lib/lane-weights";

function rng() {
  return 0.4;
}

test("a last hit on a ripe mark scores", () => {
  const start = { ...newLane(rng), pos: 1, hp: 1, alive: true };
  const hit = strikeLane(start, rng);
  assert.equal(canLastHit(start), true);
  assert.equal(hit.score, start.score + 1);
  assert.equal(hit.misses, start.misses);
});

test("an early strike or a leak misses", () => {
  const early = strikeLane({ ...newLane(rng), pos: 1, hp: 3, alive: true }, rng);
  assert.equal(early.score, 0);
  assert.equal(early.misses, 1);
  const far = strikeLane({ ...newLane(rng), pos: 6, hp: 1, alive: true }, rng);
  assert.equal(far.misses, 1);
  const leak = stepLane({ ...newLane(rng), pos: 0, hp: 1, alive: true }, false, rng);
  assert.equal(leak.misses, 1);
});

test("a deep lane sit last-hits when the mark is ripe", () => {
  const ripe = { ...newLane(rng), pos: 1, hp: 1, alive: true };
  assert.equal(pickLaneStrike(ripe, LANE_DEEP_WEIGHTS), true);
  const far = { ...newLane(rng), pos: 6, hp: 3, alive: true };
  assert.equal(pickLaneStrike(far, LANE_DEEP_WEIGHTS), false);
  const next = stepLaneHouse(ripe, LANE_FIRST_WEIGHTS, rng);
  assert.ok(next.score >= ripe.score);
});

test("looking one strike ahead can beat a one-step sit", () => {
  const far = { ...newLane(rng), pos: 4, hp: 2, alive: true };
  const one = pickLaneStrike(far, LANE_DEEP_WEIGHTS, 1);
  const two = pickLaneStrike(far, LANE_DEEP_WEIGHTS, 2);
  const s1 = scoreLaneStrike(far, one, LANE_DEEP_WEIGHTS, 2);
  const s2 = scoreLaneStrike(far, two, LANE_DEEP_WEIGHTS, 2);
  assert.ok(s2 + 1e-9 >= s1);
  assert.notEqual(scoreLaneStrike(far, false, LANE_DEEP_WEIGHTS, 1), scoreLaneStrike(far, false, LANE_DEEP_WEIGHTS, 2));
});

test("a house lane sit keeps four weights and finishes", () => {
  const result = trainLane(LANE_FIRST_WEIGHTS, 5, 24);
  assert.equal(result.weights.length, 4);
  assert.ok(result.steps > 0);
  assert.ok(result.weights.every((w) => Number.isFinite(w)));
});

test("a lane lesson keeps four weights", () => {
  assert.equal(LANE_FEATURE_COUNT, 4);
  assert.equal(laneFeatures(newLane(rng)).length, 4);
  assert.equal(LANE_FIRST_WEIGHTS.length, 4);
  const wait = peekLane({ ...newLane(rng), pos: 5, hp: 2, alive: true }, false);
  assert.equal(wait.pos, 4);
});
