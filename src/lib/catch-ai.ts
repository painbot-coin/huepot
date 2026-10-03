import { CATCH_COLS, CATCH_PAD, CATCH_ROWS, newCatch, stepCatch, type CatchState } from "@/lib/catch";
import { labRng } from "@/lib/lab-rng";

export const CATCH_FEATURES = ["bias", "paddle", "token", "gap", "fall", "cover"] as const;
export const CATCH_FEATURE_COUNT = CATCH_FEATURES.length;
export const CATCH_LOOK = 0.96;

const peekRng = () => 0.5;

function padGap(paddle: number, x: number) {
  if (x < paddle) return paddle - x;
  if (x >= paddle + CATCH_PAD) return x - (paddle + CATCH_PAD - 1);
  return 0;
}

export function catchFeatures(state: CatchState) {
  const cover = state.tokenX >= state.paddle && state.tokenX < state.paddle + CATCH_PAD ? 1 : 0;
  return [
    1,
    state.paddle / (CATCH_COLS - 2),
    state.tokenX / (CATCH_COLS - 1),
    padGap(state.paddle, state.tokenX) / CATCH_COLS,
    state.tokenY / (CATCH_ROWS - 1),
    cover,
  ];
}

export function catchValue(state: CatchState, weights: number[]) {
  const phi = catchFeatures(state);
  let sum = 0;
  for (let i = 0; i < CATCH_FEATURE_COUNT; i++) sum += (weights[i] ?? 0) * (phi[i] ?? 0);
  return sum;
}

export function catchReward(before: CatchState, after: CatchState) {
  if (after.score > before.score) return 1;
  if (after.misses > before.misses) return -1.2;
  if (!after.alive) return -1.5;
  return 0.02;
}

function catchNow(before: CatchState, after: CatchState) {
  return catchReward(before, after);
}

function catchLeaf(state: CatchState, option: CatchState, weights: number[]) {
  return catchNow(state, option) + CATCH_LOOK * catchValue(option, weights);
}

export function scoreCatchMove(state: CatchState, move: -1 | 0 | 1, weights: number[], ply = 2) {
  const next = stepCatch(state, move, peekRng);
  const now = catchNow(state, next);
  if (!next.alive || ply < 2) return now + CATCH_LOOK * catchValue(next, weights);
  let best = -Infinity;
  for (const second of [-1, 0, 1] as const) {
    const leaf = stepCatch(next, second, peekRng);
    const score = catchLeaf(next, leaf, weights);
    if (score > best) best = score;
  }
  return now + CATCH_LOOK * best;
}

export function pickCatchMove(state: CatchState, weights: number[], ply = 2): -1 | 0 | 1 {
  let best: -1 | 0 | 1 = 0;
  let bestScore = -Infinity;
  for (const move of [-1, 0, 1] as const) {
    const score = scoreCatchMove(state, move, weights, ply);
    if (score > bestScore) {
      best = move;
      bestScore = score;
    }
  }
  return best;
}

export function stepCatchHouse(state: CatchState, weights: number[], rng: () => number) {
  return stepCatch(state, pickCatchMove(state, weights), rng);
}

export function trainCatch(weights: number[], seed: number, maxSteps = 60) {
  const rng = labRng(seed);
  let state = newCatch(rng);
  let next = [...weights];
  let steps = 0;
  while (state.alive && steps < maxSteps) {
    const before = catchFeatures(state);
    const after = stepCatchHouse(state, next, rng);
    next = catchTd(next, before, catchFeatures(after), catchReward(state, after));
    state = after;
    steps += 1;
  }
  return { weights: next, score: state.score, steps, alive: state.alive };
}

export function catchTd(weights: number[], before: number[], after: number[], reward: number, alpha = 0.03) {
  let now = 0;
  let later = 0;
  for (let i = 0; i < CATCH_FEATURE_COUNT; i++) {
    now += (weights[i] ?? 0) * (before[i] ?? 0);
    later += (weights[i] ?? 0) * (after[i] ?? 0);
  }
  const delta = reward + CATCH_LOOK * later - now;
  return weights.map((w, i) => w + alpha * delta * (before[i] ?? 0));
}
