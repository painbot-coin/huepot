/** A falling-token catch. Two wells. No USDT. */

export const CATCH_COLS = 10;
export const CATCH_ROWS = 12;
export const CATCH_PAD = 2;

export type CatchState = {
  paddle: number;
  tokenX: number;
  tokenY: number;
  score: number;
  misses: number;
  alive: boolean;
};

export function clampPad(x: number) {
  return Math.max(0, Math.min(CATCH_COLS - CATCH_PAD, x));
}

export function newCatch(rng: () => number): CatchState {
  return {
    paddle: 4,
    tokenX: Math.floor(rng() * CATCH_COLS),
    tokenY: 0,
    score: 0,
    misses: 0,
    alive: true,
  };
}

export function dropToken(state: CatchState, rng: () => number): CatchState {
  return { ...state, tokenX: Math.floor(rng() * CATCH_COLS), tokenY: 0 };
}

export function stepCatch(state: CatchState, move: -1 | 0 | 1, rng: () => number): CatchState {
  if (!state.alive) return state;
  const paddle = clampPad(state.paddle + move);
  let tokenY = state.tokenY + 1;
  let score = state.score;
  let misses = state.misses;
  let tokenX = state.tokenX;
  if (tokenY >= CATCH_ROWS - 1) {
    const hit = tokenX >= paddle && tokenX < paddle + CATCH_PAD;
    if (hit) score += 1;
    else misses += 1;
    if (misses >= 3) return { ...state, paddle, score, misses, alive: false, tokenY: CATCH_ROWS - 1 };
    const next = dropToken({ ...state, paddle, score, misses, alive: true }, rng);
    return next;
  }
  return { ...state, paddle, tokenX, tokenY, score, misses };
}

export function covers(state: CatchState) {
  return state.tokenX >= state.paddle && state.tokenX < state.paddle + CATCH_PAD;
}
