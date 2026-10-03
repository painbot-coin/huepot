import { AIM_N, AIM_ROUNDS, AIM_TIME, aimGap, newAim, stepAim, type AimDir, type AimState } from "@/lib/aim";
import { labRng } from "@/lib/lab-rng";

export const AIM_FEATURES = ["bias", "error", "time", "streak"] as const;
export const AIM_FEATURE_COUNT = AIM_FEATURES.length;
export const AIM_LOOK = 0.96;

const peekRng = () => 0.5;
const DIRS: AimDir[] = [0, 1, 2, 3, 4];

export function aimFeatures(state: AimState) {
  return [1, aimGap(state) / (2 * (AIM_N - 1)), state.time / AIM_TIME, state.streak / AIM_ROUNDS];
}

export function aimValue(state: AimState, weights: number[]) {
  const phi = aimFeatures(state);
  let sum = 0;
  for (let i = 0; i < AIM_FEATURE_COUNT; i++) sum += (weights[i] ?? 0) * (phi[i] ?? 0);
  return sum;
}

export function aimReward(before: AimState, after: AimState) {
  if (after.score > before.score) return 1;
  if (after.misses > before.misses) return -1.2;
  if (!after.alive) return -0.4;
  return 0.02;
}

function aimNow(before: AimState, after: AimState) {
  return aimReward(before, after);
}

function aimLeaf(state: AimState, option: AimState, weights: number[]) {
  return aimNow(state, option) + AIM_LOOK * aimValue(option, weights);
}

export function scoreAimMove(state: AimState, dir: AimDir, weights: number[], ply = 2) {
  const next = stepAim(state, dir, peekRng);
  const now = aimNow(state, next);
  if (!next.alive || ply < 2) return now + AIM_LOOK * aimValue(next, weights);
  let best = -Infinity;
  for (const second of DIRS) {
    const leaf = stepAim(next, second, peekRng);
    const score = aimLeaf(next, leaf, weights);
    if (score > best) best = score;
  }
  return now + AIM_LOOK * best;
}

export function pickAimMove(state: AimState, weights: number[], ply = 2): AimDir {
  let best: AimDir = 4;
  let bestScore = -Infinity;
  for (const dir of DIRS) {
    const score = scoreAimMove(state, dir, weights, ply);
    if (score > bestScore) {
      best = dir;
      bestScore = score;
    }
  }
  return best;
}

export function stepAimHouse(state: AimState, weights: number[], rng: () => number) {
  return stepAim(state, pickAimMove(state, weights), rng);
}

export function trainAim(weights: number[], seed: number, maxSteps = 60) {
  const rng = labRng(seed);
  let state = newAim(rng);
  let next = [...weights];
  let steps = 0;
  while (state.alive && steps < maxSteps) {
    const before = aimFeatures(state);
    const after = stepAimHouse(state, next, rng);
    next = aimTd(next, before, aimFeatures(after), aimReward(state, after));
    state = after;
    steps += 1;
  }
  return { weights: next, score: state.score, steps, alive: state.alive };
}

export function aimTd(weights: number[], before: number[], after: number[], reward: number, alpha = 0.03) {
  let now = 0;
  let later = 0;
  for (let i = 0; i < AIM_FEATURE_COUNT; i++) {
    now += (weights[i] ?? 0) * (before[i] ?? 0);
    later += (weights[i] ?? 0) * (after[i] ?? 0);
  }
  const delta = reward + AIM_LOOK * later - now;
  return weights.map((w, i) => w + alpha * delta * (before[i] ?? 0));
}
