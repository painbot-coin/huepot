/** A flick sit. Not Counter-Strike. Two wells. No USDT. */

export const AIM_N = 8;
export const AIM_ROUNDS = 8;
export const AIM_TIME = 12;

export type AimDir = 0 | 1 | 2 | 3 | 4;

export type AimState = {
  cursor: number;
  target: number;
  time: number;
  score: number;
  misses: number;
  streak: number;
  round: number;
  alive: boolean;
};

function cellOf(rng: () => number) {
  return Math.floor(rng() * AIM_N * AIM_N);
}

export function xyOf(cell: number) {
  return { x: cell % AIM_N, y: Math.floor(cell / AIM_N) };
}

export function aimGap(state: AimState) {
  const a = xyOf(state.cursor);
  const b = xyOf(state.target);
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function shiftAim(cell: number, dir: AimDir) {
  if (dir === 4) return cell;
  const { x, y } = xyOf(cell);
  const nx = dir === 1 ? x + 1 : dir === 3 ? x - 1 : x;
  const ny = dir === 2 ? y + 1 : dir === 0 ? y - 1 : y;
  if (nx < 0 || ny < 0 || nx >= AIM_N || ny >= AIM_N) return cell;
  return ny * AIM_N + nx;
}

function dealTarget(avoid: number, rng: () => number) {
  let next = cellOf(rng);
  if (next === avoid) next = (next + 1) % (AIM_N * AIM_N);
  return next;
}

export function newAim(rng: () => number): AimState {
  const cursor = cellOf(rng);
  return {
    cursor,
    target: dealTarget(cursor, rng),
    time: AIM_TIME,
    score: 0,
    misses: 0,
    streak: 0,
    round: 0,
    alive: true,
  };
}

function afterShot(state: AimState, hit: boolean, rng: () => number): AimState {
  const score = state.score + (hit ? 1 : 0);
  const misses = state.misses + (hit ? 0 : 1);
  const streak = hit ? state.streak + 1 : 0;
  const round = state.round + 1;
  if (round >= AIM_ROUNDS) {
    return { ...state, score, misses, streak, round, time: 0, alive: false };
  }
  const cursor = state.cursor;
  return {
    ...state,
    cursor,
    target: dealTarget(cursor, rng),
    time: AIM_TIME,
    score,
    misses,
    streak,
    round,
    alive: true,
  };
}

export function stepAim(state: AimState, dir: AimDir, rng: () => number): AimState {
  if (!state.alive) return state;
  const cursor = shiftAim(state.cursor, dir);
  if (cursor === state.target) return afterShot({ ...state, cursor }, true, rng);
  const time = state.time - 1;
  if (time <= 0) return afterShot({ ...state, cursor, time: 0 }, false, rng);
  return { ...state, cursor, time };
}

export function flickAim(state: AimState, cell: number, rng: () => number): AimState {
  if (!state.alive) return state;
  if (cell < 0 || cell >= AIM_N * AIM_N) return state;
  const cursor = cell;
  if (cursor === state.target) return afterShot({ ...state, cursor }, true, rng);
  return afterShot({ ...state, cursor }, false, rng);
}
