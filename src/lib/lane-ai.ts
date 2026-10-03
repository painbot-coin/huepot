import {
  LANE_MAX_HP,
  LANE_N,
  inLaneRange,
  newLane,
  peekLane,
  stepLane,
  type LaneState,
} from "@/lib/lane";
import { labRng } from "@/lib/lab-rng";

export const LANE_FEATURES = ["bias", "range", "hp", "reach"] as const;
export const LANE_FEATURE_COUNT = LANE_FEATURES.length;
export const LANE_LOOK = 0.96;

export function laneFeatures(state: LaneState) {
  return [
    1,
    state.pos / (LANE_N - 1),
    state.hp / LANE_MAX_HP,
    inLaneRange(state) ? 1 : 0,
  ];
}

export function laneValue(state: LaneState, weights: number[]) {
  const phi = laneFeatures(state);
  let sum = 0;
  for (let i = 0; i < LANE_FEATURE_COUNT; i++) sum += (weights[i] ?? 0) * (phi[i] ?? 0);
  return sum;
}

export function laneReward(before: LaneState, after: LaneState) {
  if (after.score > before.score) return 1;
  if (after.misses > before.misses) return -1.2;
  if (!after.alive) return -0.4;
  return 0.02;
}

function laneNow(before: LaneState, after: LaneState) {
  return laneReward(before, after);
}

function laneLeaf(state: LaneState, option: LaneState, weights: number[]) {
  return laneNow(state, option) + LANE_LOOK * laneValue(option, weights);
}

export function scoreLaneStrike(state: LaneState, strike: boolean, weights: number[], ply = 2) {
  const next = peekLane(state, strike);
  const now = laneNow(state, next);
  if (!next.alive || ply < 2) return now + LANE_LOOK * laneValue(next, weights);
  let best = -Infinity;
  for (const second of [false, true]) {
    const leaf = peekLane(next, second);
    const score = laneLeaf(next, leaf, weights);
    if (score > best) best = score;
  }
  return now + LANE_LOOK * best;
}

export function pickLaneStrike(state: LaneState, weights: number[], ply = 2) {
  let best = false;
  let bestScore = -Infinity;
  for (const strike of [false, true]) {
    const score = scoreLaneStrike(state, strike, weights, ply);
    if (score > bestScore) {
      best = strike;
      bestScore = score;
    }
  }
  return best;
}

export function stepLaneHouse(state: LaneState, weights: number[], rng: () => number) {
  return stepLane(state, pickLaneStrike(state, weights), rng);
}

export function trainLane(weights: number[], seed: number, maxSteps = 60) {
  const rng = labRng(seed);
  let state = newLane(rng);
  let next = [...weights];
  let steps = 0;
  while (state.alive && steps < maxSteps) {
    const before = laneFeatures(state);
    const after = stepLaneHouse(state, next, rng);
    next = laneTd(next, before, laneFeatures(after), laneReward(state, after));
    state = after;
    steps += 1;
  }
  return { weights: next, score: state.score, steps, alive: state.alive };
}

export function laneTd(weights: number[], before: number[], after: number[], reward: number, alpha = 0.03) {
  let now = 0;
  let later = 0;
  for (let i = 0; i < LANE_FEATURE_COUNT; i++) {
    now += (weights[i] ?? 0) * (before[i] ?? 0);
    later += (weights[i] ?? 0) * (after[i] ?? 0);
  }
  const delta = reward + LANE_LOOK * later - now;
  return weights.map((w, i) => w + alpha * delta * (before[i] ?? 0));
}
