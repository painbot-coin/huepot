import {
  SNAKE_N,
  cycleSpan,
  neighborCell,
  newSnake,
  stepSnake,
  turnSnake,
  xyOf,
  type SnakeDir,
  type SnakeState,
} from "@/lib/snake";
import { labRng } from "@/lib/lab-rng";

export const SNAKE_FEATURES = ["bias", "ahead", "left", "right", "foodA", "foodS"] as const;
export const SNAKE_FEATURE_COUNT = SNAKE_FEATURES.length;
export const SNAKE_LOOK = 0.96;

const peekRng = () => 0.5;

function danger(state: SnakeState, dir: SnakeDir) {
  const head = state.body[0] ?? 0;
  const nxt = neighborCell(head, dir);
  if (nxt == null) return 1;
  const tail = state.body[state.body.length - 1];
  if (nxt !== state.food && nxt === tail) return 0;
  return state.body.includes(nxt) ? 1 : 0;
}

function manhattan(state: SnakeState) {
  const head = xyOf(state.body[0] ?? 0);
  const food = xyOf(state.food);
  return Math.abs(food.x - head.x) + Math.abs(food.y - head.y);
}

function appetite(weights: number[]) {
  const hunt = Math.max(0, weights[4] ?? 0) + 0.45 * Math.max(0, weights[5] ?? 0);
  return Math.min(3, Math.max(0.55, hunt));
}

function spaceCut(from: number, to: number, food: number, ate: boolean) {
  const a = xyOf(from);
  const meal = xyOf(food);
  const before = Math.abs(meal.x - a.x) + Math.abs(meal.y - a.y);
  if (ate) return before;
  const b = xyOf(to);
  return before - (Math.abs(meal.x - b.x) + Math.abs(meal.y - b.y));
}

/**
 * The board is one loop. A forward step on the open arc between the head and
 * the tail cannot seal the snake in. On that arc, closing on the food beats a
 * longer jump that walks away. Off the arc, the step is refused.
 */
function cycleScore(before: SnakeState, after: SnakeState, weights: number[]) {
  if (!after.alive) return -8;
  const head = before.body[0] ?? 0;
  const tail = before.body[before.body.length - 1] ?? head;
  const cell = after.body[0] ?? 0;
  const room = cycleSpan(head, tail);
  const toTail = cell === tail ? 0 : cycleSpan(cell, tail);
  const onArc = room === 0 || cell === tail || toTail < room;
  const ate = after.score > before.score;
  const beforeDist = cycleSpan(head, before.food);
  const afterDist = ate ? 0 : cycleSpan(cell, before.food);
  const progress = beforeDist - afterDist;
  const cut = spaceCut(head, cell, before.food, ate);
  if (!onArc || (!ate && progress < 1)) return -4;
  if (ate) return 40;
  const hunt = appetite(weights);
  return 2 + Math.max(progress, 0) * hunt + Math.max(cut, 0) * (2 + hunt);
}

export function snakeFeatures(state: SnakeState) {
  const head = xyOf(state.body[0] ?? 0);
  const food = xyOf(state.food);
  const fx = food.x - head.x;
  const fy = food.y - head.y;
  const ahead =
    state.dir === 0 ? -fy : state.dir === 1 ? fx : state.dir === 2 ? fy : -fx;
  const side =
    state.dir === 0 ? fx : state.dir === 1 ? fy : state.dir === 2 ? -fx : -fy;
  return [
    1,
    danger(state, state.dir),
    danger(state, turnSnake(state.dir, -1)),
    danger(state, turnSnake(state.dir, 1)),
    ahead / SNAKE_N,
    side / SNAKE_N,
  ];
}

export function snakeValue(state: SnakeState, weights: number[]) {
  const phi = snakeFeatures(state);
  let sum = 0;
  for (let i = 0; i < SNAKE_FEATURE_COUNT; i++) sum += (weights[i] ?? 0) * (phi[i] ?? 0);
  return sum;
}

export function snakeReward(before: SnakeState, after: SnakeState) {
  if (!after.alive) return -1.5;
  if (after.score > before.score) return 1.6;
  const closer = manhattan(before) - manhattan(after);
  if (closer > 0) return 0.12;
  if (closer < 0) return -0.04;
  return 0;
}

export function scoreSnakeTurn(state: SnakeState, turn: -1 | 0 | 1, weights: number[], ply = 2) {
  const next = stepSnake(state, turn, peekRng);
  if (!next.alive) return -8;
  const now = cycleScore(state, next, weights);
  if (ply < 2) return now;
  let best = -Infinity;
  for (const second of [-1, 0, 1] as const) {
    const leaf = stepSnake(next, second, peekRng);
    const score = leaf.alive ? cycleScore(next, leaf, weights) : -8;
    if (score > best) best = score;
  }
  // The extra look is noted, and it does not outrank a living step.
  return now + (Number.isFinite(best) ? 0.000001 : 0);
}

export function pickSnakeTurn(state: SnakeState, weights: number[], ply = 2): -1 | 0 | 1 {
  let best: -1 | 0 | 1 = 0;
  let bestScore = -Infinity;
  for (const turn of [-1, 0, 1] as const) {
    const score = scoreSnakeTurn(state, turn, weights, ply);
    if (score > bestScore) {
      best = turn;
      bestScore = score;
    }
  }
  return best;
}

export function stepSnakeHouse(state: SnakeState, weights: number[], rng: () => number) {
  return stepSnake(state, pickSnakeTurn(state, weights), rng);
}

export function trainSnake(weights: number[], seed: number, maxSteps = 60) {
  const rng = labRng(seed);
  let state = newSnake(rng);
  let next = [...weights];
  let steps = 0;
  while (state.alive && steps < maxSteps) {
    const before = snakeFeatures(state);
    const after = stepSnakeHouse(state, next, rng);
    next = snakeTd(next, before, snakeFeatures(after), snakeReward(state, after));
    state = after;
    steps += 1;
  }
  return { weights: next, score: state.score, steps, alive: state.alive };
}

export function snakeTd(weights: number[], before: number[], after: number[], reward: number, alpha = 0.03) {
  let now = 0;
  let later = 0;
  for (let i = 0; i < SNAKE_FEATURE_COUNT; i++) {
    now += (weights[i] ?? 0) * (before[i] ?? 0);
    later += (weights[i] ?? 0) * (after[i] ?? 0);
  }
  const delta = reward + SNAKE_LOOK * later - now;
  return weights.map((w, i) => w + alpha * delta * (before[i] ?? 0));
}
