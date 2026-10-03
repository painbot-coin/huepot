import {
  BREAK_COLS,
  BREAK_PAD,
  BREAK_ROWS,
  breakAimX,
  breakPadGap,
  brickCount,
  bricksBeforePad,
  clampPad,
  newBreak,
  stepBreak,
  type BreakState,
} from "@/lib/break";
import { labRng } from "@/lib/lab-rng";

export const BREAK_FEATURES = ["bias", "pad", "ballx", "bally"] as const;
export const BREAK_FEATURE_COUNT = BREAK_FEATURES.length;
export const BREAK_LOOK = 0.96;

const peekRng = () => 0.5;

export function breakFeatures(state: BreakState) {
  return [
    1,
    state.paddle / (BREAK_COLS - BREAK_PAD),
    breakPadGap(state) / BREAK_COLS,
    state.ballY / (BREAK_ROWS - 1),
  ];
}

export function breakValue(state: BreakState, weights: number[]) {
  const phi = breakFeatures(state);
  let sum = 0;
  for (let i = 0; i < BREAK_FEATURE_COUNT; i++) sum += (weights[i] ?? 0) * (phi[i] ?? 0);
  return sum;
}

export function breakReward(before: BreakState, after: BreakState) {
  if (after.score > before.score) return 1;
  if (after.misses > before.misses) return -1.2;
  if (!after.alive) return -1.5;
  return 0.02;
}

function breakNow(before: BreakState, after: BreakState) {
  return breakReward(before, after);
}

function breakLeaf(state: BreakState, option: BreakState, weights: number[]) {
  return breakNow(state, option) + BREAK_LOOK * breakValue(option, weights);
}

export function scoreBreakMove(state: BreakState, move: -1 | 0 | 1, weights: number[], ply = 2) {
  const next = stepBreak(state, move, peekRng);
  const now = breakNow(state, next);
  if (!next.alive || ply < 2) return now + BREAK_LOOK * breakValue(next, weights);
  let best = -Infinity;
  for (const second of [-1, 0, 1] as const) {
    const leaf = stepBreak(next, second, peekRng);
    const score = breakLeaf(next, leaf, weights);
    if (score > best) best = score;
  }
  return now + BREAK_LOOK * best;
}

function padGap(paddle: number, aim: number) {
  if (aim < paddle) return paddle - aim;
  if (aim >= paddle + BREAK_PAD) return aim - (paddle + BREAK_PAD - 1);
  return 0;
}

function returnSide(paddle: number, aim: number): -1 | 1 | 0 {
  if (aim < paddle || aim >= paddle + BREAK_PAD) return 0;
  return aim === paddle ? -1 : 1;
}

/** More bricks on the return. The incoming angle stays when both returns miss. */
function steerScore(state: BreakState, paddle: number, aim: number) {
  const side = returnSide(paddle, aim);
  if (side === 0) return -1;
  if (brickCount(state.bricks) > 4) return side === state.vx ? 1 : 0;
  const hits = bricksBeforePad(state, aim, side);
  const keep = side === state.vx ? 1 : 0;
  return hits * 10 + keep;
}

export function pickBreakMove(state: BreakState, weights: number[], ply = 2): -1 | 0 | 1 {
  const aim = breakAimX(state);
  let best: -1 | 0 | 1 = 0;
  let bestGap = Infinity;
  let bestSteer = -Infinity;
  let bestScore = -Infinity;
  for (const move of [-1, 0, 1] as const) {
    const paddle = clampPad(state.paddle + move);
    const gap = padGap(paddle, aim);
    const steer = steerScore(state, paddle, aim);
    const score = scoreBreakMove(state, move, weights, ply);
    if (gap < bestGap || (gap === bestGap && steer > bestSteer) || (gap === bestGap && steer === bestSteer && score > bestScore)) {
      best = move;
      bestGap = gap;
      bestSteer = steer;
      bestScore = score;
    }
  }
  return best;
}

export function stepBreakHouse(state: BreakState, weights: number[], rng: () => number) {
  return stepBreak(state, pickBreakMove(state, weights), rng);
}

export function trainBreak(weights: number[], seed: number, maxSteps = 60) {
  const rng = labRng(seed);
  let state = newBreak(rng);
  let next = [...weights];
  let steps = 0;
  while (state.alive && steps < maxSteps) {
    const before = breakFeatures(state);
    const after = stepBreakHouse(state, next, rng);
    next = breakTd(next, before, breakFeatures(after), breakReward(state, after));
    state = after;
    steps += 1;
  }
  return { weights: next, score: state.score, steps, alive: state.alive };
}

export function breakTd(weights: number[], before: number[], after: number[], reward: number, alpha = 0.03) {
  let now = 0;
  let later = 0;
  for (let i = 0; i < BREAK_FEATURE_COUNT; i++) {
    now += (weights[i] ?? 0) * (before[i] ?? 0);
    later += (weights[i] ?? 0) * (after[i] ?? 0);
  }
  const delta = reward + BREAK_LOOK * later - now;
  return weights.map((w, i) => w + alpha * delta * (before[i] ?? 0));
}
