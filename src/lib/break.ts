/** A brick sit. Two wells. No USDT. Not a rehosted net. */

export const BREAK_COLS = 8;
export const BREAK_ROWS = 10;
export const BREAK_BRICK_ROWS = 3;
export const BREAK_PAD = 2;
export const BREAK_BRICKS = BREAK_COLS * BREAK_BRICK_ROWS;
export const BREAK_LIVES = 3;

export type BreakState = {
  paddle: number;
  ballX: number;
  ballY: number;
  vx: -1 | 1;
  vy: -1 | 1;
  bricks: number;
  score: number;
  misses: number;
  alive: boolean;
};

export function clampPad(x: number) {
  return Math.max(0, Math.min(BREAK_COLS - BREAK_PAD, x));
}

export function fullWall() {
  return (1 << BREAK_BRICKS) - 1;
}

export function brickOn(bricks: number, x: number, y: number) {
  if (y < 0 || y >= BREAK_BRICK_ROWS || x < 0 || x >= BREAK_COLS) return false;
  return (bricks & (1 << (y * BREAK_COLS + x))) !== 0;
}

export function clearBrick(bricks: number, x: number, y: number) {
  if (!brickOn(bricks, x, y)) return bricks;
  return bricks & ~(1 << (y * BREAK_COLS + x));
}

export function brickCount(bricks: number) {
  let n = 0;
  let wall = bricks >>> 0;
  while (wall) {
    n += wall & 1;
    wall >>>= 1;
  }
  return n;
}

export function covers(state: Pick<BreakState, "paddle" | "ballX">) {
  return state.ballX >= state.paddle && state.ballX < state.paddle + BREAK_PAD;
}

/** Column where the gold meets the pad, after walls and bricks. */
export function breakAimX(state: Pick<BreakState, "ballX" | "ballY" | "vx" | "vy" | "bricks">) {
  let x = state.ballX;
  let y = state.ballY;
  let vx = state.vx;
  let vy = state.vy;
  let bricks = state.bricks;
  for (let n = 0; n < 48; n++) {
    let nx = x + vx;
    if (nx < 0 || nx >= BREAK_COLS) {
      vx = vx === 1 ? -1 : 1;
      nx = x + vx;
    }
    nx = Math.max(0, Math.min(BREAK_COLS - 1, nx));

    let ny = y + vy;
    if (ny < 0) {
      vy = 1;
      ny = y + vy;
    }

    if (brickOn(bricks, nx, ny)) {
      bricks = clearBrick(bricks, nx, ny);
      vy = vy === 1 ? -1 : 1;
      ny = y;
      if (bricks === 0) bricks = fullWall();
      x = nx;
      y = ny;
      continue;
    }

    if (ny >= BREAK_ROWS - 1) return nx;
    x = nx;
    y = ny;
  }
  return x;
}

export function breakPadGap(state: Pick<BreakState, "paddle" | "ballX" | "ballY" | "vx" | "vy" | "bricks">) {
  const x = breakAimX(state);
  if (x < state.paddle) return state.paddle - x;
  if (x >= state.paddle + BREAK_PAD) return x - (state.paddle + BREAK_PAD - 1);
  return 0;
}

/** Bricks this return meets before the gold comes back down. */
export function bricksBeforePad(state: Pick<BreakState, "bricks">, aim: number, vxIn: -1 | 1) {
  let x = aim;
  let y = BREAK_ROWS - 2;
  let vx = vxIn;
  let vy: -1 | 1 = -1;
  let bricks = state.bricks;
  let hits = 0;
  for (let n = 0; n < 48; n++) {
    let nx = x + vx;
    if (nx < 0 || nx >= BREAK_COLS) {
      vx = vx === 1 ? -1 : 1;
      nx = x + vx;
    }
    nx = Math.max(0, Math.min(BREAK_COLS - 1, nx));
    let ny = y + vy;
    if (ny < 0) {
      vy = 1;
      ny = y + vy;
    }
    if (brickOn(bricks, nx, ny)) {
      bricks = clearBrick(bricks, nx, ny);
      hits += 1;
      vy = vy === 1 ? -1 : 1;
      ny = y;
      if (bricks === 0) return hits;
      x = nx;
      y = ny;
      continue;
    }
    if (ny >= BREAK_ROWS - 1) return hits;
    x = nx;
    y = ny;
  }
  return hits;
}

/** Pad placed so the landing column sits on it. */
export function padOnAim(aim: number) {
  return clampPad(aim);
}

/** Next ball. The pad is already on the column where this ball comes down. */
export function serveBreak(state: BreakState, rng: () => number): BreakState {
  const vx = rng() < 0.5 ? -1 : 1;
  const draft: BreakState = {
    ...state,
    ballX: Math.min(BREAK_COLS - 1, Math.max(0, state.paddle)),
    ballY: BREAK_ROWS - 3,
    vx,
    vy: -1,
  };
  return { ...draft, paddle: padOnAim(breakAimX(draft)) };
}

export function newBreak(rng: () => number): BreakState {
  return serveBreak(
    {
      paddle: 3,
      ballX: 3,
      ballY: BREAK_ROWS - 3,
      vx: 1,
      vy: -1,
      bricks: fullWall(),
      score: 0,
      misses: 0,
      alive: true,
    },
    rng,
  );
}

export function stepBreak(state: BreakState, move: -1 | 0 | 1, rng: () => number): BreakState {
  if (!state.alive) return state;
  const paddle = clampPad(state.paddle + move);
  let { ballX, ballY, vx, vy, bricks, score, misses } = state;

  let nx = ballX + vx;
  if (nx < 0 || nx >= BREAK_COLS) {
    vx = vx === 1 ? -1 : 1;
    nx = ballX + vx;
  }
  nx = Math.max(0, Math.min(BREAK_COLS - 1, nx));

  let ny = ballY + vy;
  if (ny < 0) {
    vy = 1;
    ny = ballY + vy;
  }

  if (brickOn(bricks, nx, ny)) {
    bricks = clearBrick(bricks, nx, ny);
    score += 1;
    vy = vy === 1 ? -1 : 1;
    ny = ballY;
    if (bricks === 0) {
      return serveBreak(
        { ...state, paddle, bricks: fullWall(), score, misses, alive: true },
        rng,
      );
    }
    return { ...state, paddle, ballX: nx, ballY: ny, vx, vy, bricks, score, misses };
  }

  if (ny >= BREAK_ROWS - 1) {
    const hit = nx >= paddle && nx < paddle + BREAK_PAD;
    if (hit) {
      const side: -1 | 1 = nx === paddle ? -1 : 1;
      const nextVx = brickCount(bricks) > 4 ? vx : side;
      return { ...state, paddle, ballX: nx, ballY: BREAK_ROWS - 2, vx: nextVx, vy: -1, bricks, score, misses };
    }
    misses += 1;
    if (misses >= BREAK_LIVES) {
      return {
        ...state,
        paddle,
        ballX: nx,
        ballY: BREAK_ROWS - 1,
        vx,
        vy,
        bricks,
        score,
        misses,
        alive: false,
      };
    }
    return serveBreak({ ...state, paddle, bricks, score, misses, alive: true }, rng);
  }

  return { ...state, paddle, ballX: nx, ballY: ny, vx, vy, bricks, score, misses };
}
