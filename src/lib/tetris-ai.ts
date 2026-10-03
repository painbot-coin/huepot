/**
 * A linear value function trained by TD(0).
 *
 * The house does not play another seat. It picks a placement that raises
 * V(s') = w · φ(s'), looking one queued piece ahead, then the weights move
 * toward the return it actually got. No USDT. No second ranking.
 */

import {
  applyPlacement,
  blocked,
  bumpiness,
  columnHeights,
  countHoles,
  ghostY,
  hardDrop,
  legalPlacements,
  makeRng,
  newGame,
  rotate,
  shift,
  towardPlacement,
  type Cell,
  type Placement,
  type TetrisState,
} from "@/lib/tetris";
import { type StackStyleId } from "@/lib/tetris-style";
import { HOUSE_STACK_WEIGHTS } from "@/lib/tetris-weights";

export const FEATURES = 6;

export function features(grid: Cell[]): number[] {
  const heights = columnHeights(grid);
  const agg = heights.reduce((sum, h) => sum + h, 0);
  const holes = countHoles(grid);
  const bump = bumpiness(heights);
  const max = Math.max(...heights, 0);
  let wells = 0;
  for (let i = 0; i < heights.length; i++) {
    const left = i === 0 ? 20 : (heights[i - 1] ?? 0);
    const right = i === heights.length - 1 ? 20 : (heights[i + 1] ?? 0);
    const h = heights[i] ?? 0;
    const drop = Math.min(left, right) - h;
    if (drop > 0) wells += (drop * (drop + 1)) / 2;
  }
  return [1, agg / 20, holes / 10, bump / 20, max / 20, wells / 20];
}

export function valueOf(grid: Cell[], weights: number[]) {
  const phi = features(grid);
  let sum = 0;
  for (let i = 0; i < FEATURES; i++) sum += (weights[i] ?? 0) * (phi[i] ?? 0);
  return sum;
}

export function rewardOf(lines: number, dead: boolean) {
  const clear = lines === 1 ? 1 : lines === 2 ? 3 : lines === 3 ? 5 : lines >= 4 ? 8 : 0;
  return dead ? clear - 8 : clear;
}

export function styleReward(style: StackStyleId, lines: number, dead: boolean) {
  if (style === "live" || style === "all") return rewardOf(lines, dead);
  const die = dead ? -8 : 0;
  if (style === "down" || style === "speed") return die + (lines > 0 ? 2 + lines : 0);
  if (style === "tank" || style === "clean") return die + (lines > 0 ? 1.6 : 0);
  if (style === "burst" || style === "tech") {
    return die + (lines >= 4 ? 14 : lines === 3 ? 4 : lines === 2 ? 1 : 0);
  }
  if (style === "press") {
    return die + (lines === 1 ? 0.4 : lines === 2 ? 4 : lines === 3 ? 6 : lines >= 4 ? 7 : 0);
  }
  if (style === "cheese") {
    return die + (lines === 1 ? 3 : lines === 2 ? 4 : lines === 3 ? 1.5 : lines >= 4 ? 0.5 : 0);
  }
  if (style === "combo") return die + (lines > 0 ? 3 + lines : 0);
  return rewardOf(lines, dead);
}

export function styleMaxClear(style: StackStyleId) {
  return style === "live" ? 2 : 4;
}

function wellSum(heights: number[]) {
  let wells = 0;
  for (let i = 0; i < heights.length; i++) {
    const left = i === 0 ? 20 : (heights[i - 1] ?? 0);
    const right = i === heights.length - 1 ? 20 : (heights[i + 1] ?? 0);
    const drop = Math.min(left, right) - (heights[i] ?? 0);
    if (drop > 0) wells += (drop * (drop + 1)) / 2;
  }
  return wells;
}

export function stylePickBias(style: StackStyleId, option: Placement) {
  const heights = columnHeights(option.grid);
  const holes = countHoles(option.grid);
  const bump = bumpiness(heights);
  const peak = Math.max(...heights, 0);
  const wells = wellSum(heights);
  if (style === "down") return -2.4 * peak - 1.4 * holes + (option.lines > 0 ? 1.5 : 0);
  if (style === "tank") return -0.85 * peak - 0.2 * holes;
  if (style === "clean") return -1.8 * holes - 0.4 * bump - 0.1 * peak;
  if (style === "burst") {
    if (option.lines >= 4) return 20;
    if (peak >= 16 && option.lines > 0) return 2;
    if (option.lines > 0) return -5;
    const sorted = [...heights].sort((a, b) => a - b);
    const floor = sorted[0] ?? 0;
    const lip = sorted[1] ?? floor;
    const depth = lip - floor;
    const spread = (sorted[sorted.length - 1] ?? 0) - lip;
    return 1.1 * Math.min(depth, 4) - 0.55 * spread - 2 * holes;
  }
  if (style === "tech") {
    return -1.3 * holes + (option.lines >= 4 ? 5.5 : option.lines === 3 ? 3.4 : option.lines > 0 ? -1 : 0);
  }
  if (style === "combo") {
    return 0.35 * Math.min(wells, 12) + (option.lines > 0 ? 1.4 : 0) - 0.9 * holes - 0.15 * Math.max(0, peak - 8);
  }
  if (style === "cheese") {
    return (option.lines === 1 ? 3 : option.lines === 2 ? 1.1 : option.lines >= 3 ? -2.2 : 0) + 0.12 * holes;
  }
  if (style === "speed") return option.lines > 0 ? 2.1 : -0.35;
  if (style === "press") {
    return option.lines === 2 ? 3.4 : option.lines === 3 ? 2.2 : option.lines >= 4 ? 0.8 : option.lines === 1 ? -0.8 : 0;
  }
  return 0;
}

function lockNow(kind: StackStyleId, option: Placement) {
  return styleReward(kind, option.lines, false) + stylePickBias(kind, option);
}

function lockLeaf(kind: StackStyleId, option: Placement, weights: number[]) {
  return lockNow(kind, option) + 0.97 * valueOf(option.grid, weights);
}

/** The board after this lock, with the queued piece spawned. */
export function afterLock(state: TetrisState, option: Placement): TetrisState {
  const next = state.queue[0];
  const x = 3;
  const y = next === "I" ? -1 : 0;
  return {
    ...state,
    grid: option.grid,
    piece: next ?? state.piece,
    rot: 0,
    x,
    y,
    queue: state.queue.slice(1),
    lines: state.lines + option.lines,
    alive: Boolean(next) && !blocked(option.grid, next, 0, x, y),
  };
}

export function scorePlacement(
  state: TetrisState,
  option: Placement,
  weights: number[],
  kind: StackStyleId,
  maxClear: number,
  ply = 2,
) {
  const now = lockNow(kind, option);
  if (ply < 2 || !state.queue[0]) return now + 0.97 * valueOf(option.grid, weights);
  const after = afterLock(state, option);
  if (!after.alive) return now + 0.97 * styleReward(kind, 0, true);
  const options = legalPlacements(after);
  const capped = options.filter((row) => row.lines <= maxClear);
  const pool = capped.length ? capped : options;
  if (!pool.length) return now + 0.97 * styleReward(kind, 0, true);
  let best = -Infinity;
  for (const row of pool) {
    const score = lockLeaf(kind, row, weights);
    if (score > best) best = score;
  }
  return now + 0.97 * best;
}

export function pickPlacement(
  state: TetrisState,
  weights: number[],
  style: StackStyleId | number = "live",
  ply = 2,
): Placement | null {
  const kind: StackStyleId = typeof style === "number" ? "live" : style;
  const maxClear = typeof style === "number" ? style : styleMaxClear(kind);
  const options = legalPlacements(state);
  if (!options.length) return null;
  const capped = options.filter((row) => row.lines <= maxClear);
  const pool = capped.length ? capped : options;
  let best = pool[0]!;
  let bestScore = -Infinity;
  for (const option of pool) {
    const score = scorePlacement(state, option, weights, kind, maxClear, ply);
    if (score > bestScore) {
      best = option;
      bestScore = score;
    }
  }
  return best;
}

export function stepHouse(
  state: TetrisState,
  weights: number[],
  rng: () => number,
  style: StackStyleId = "live",
): TetrisState {
  if (!state.alive) return state;
  const place = pickPlacement(state, weights, style);
  if (!place) return { ...state, alive: false };
  const step = towardPlacement(state, place);
  if (step === "rot") return rotate(state, 1);
  if (step === "left") return shift(state, -1);
  if (step === "right") return shift(state, 1);
  const fall = ghostY(state);
  if (state.y < fall) return { ...state, y: fall };
  return hardDrop(state, rng);
}

export function tdUpdate(
  weights: number[],
  before: Cell[],
  after: Cell[],
  reward: number,
  alpha = 0.01,
  gamma = 0.97,
) {
  const phi = features(before);
  const delta = reward + gamma * valueOf(after, weights) - valueOf(before, weights);
  return weights.map((w, i) => w + alpha * delta * (phi[i] ?? 0));
}

export function emptyWeights() {
  return Array.from({ length: FEATURES }, () => 0);
}

export function trainGame(
  weights: number[],
  seed: number,
  maxPieces = 120,
  style: StackStyleId = "live",
) {
  const rng = makeRng(seed);
  let state = newGame(rng);
  let next = [...weights];
  let pieces = 0;
  while (state.alive && pieces < maxPieces) {
    const before = state.grid;
    const place = pickPlacement(state, next, style);
    if (!place) break;
    state = applyPlacement(state, place, rng);
    next = tdUpdate(next, before, state.grid, styleReward(style, place.lines, !state.alive));
    pieces += 1;
  }
  return { weights: next, lines: state.lines, pieces, alive: state.alive };
}

export function trainStyle(style: StackStyleId, games: number, seed = 7, start = HOUSE_STACK_WEIGHTS) {
  let weights = [...start];
  let best = 0;
  let pieces = 0;
  for (let i = 0; i < games; i++) {
    const result = trainGame(weights, (seed + i * 9973) >>> 0 || 1, 100, style);
    weights = result.weights.map((w, n) => {
      if (!Number.isFinite(w)) return start[n] ?? 0;
      return Math.max(-25, Math.min(25, w));
    });
    best = Math.max(best, result.lines);
    pieces += result.pieces;
  }
  return { weights, best, pieces, games };
}
