/** A ten-by-ten snake. Two wells. No USDT. */

export const SNAKE_N = 10;

export type SnakeDir = 0 | 1 | 2 | 3;

export type SnakeState = {
  body: number[];
  dir: SnakeDir;
  food: number;
  score: number;
  alive: boolean;
};

const STEP = [-SNAKE_N, 1, SNAKE_N, -1];

function buildCycle() {
  const order: number[] = [];
  for (let y = 0; y < SNAKE_N; y++) {
    if (y % 2 === 0) {
      for (let x = 1; x < SNAKE_N; x++) order.push(y * SNAKE_N + x);
    } else {
      for (let x = SNAKE_N - 1; x >= 1; x--) order.push(y * SNAKE_N + x);
    }
  }
  order.push((SNAKE_N - 1) * SNAKE_N);
  for (let y = SNAKE_N - 2; y >= 0; y--) order.push(y * SNAKE_N);
  return order;
}

const CYCLE = buildCycle();
const CYCLE_NEXT = new Array<number>(SNAKE_N * SNAKE_N);
const CYCLE_PREV = new Array<number>(SNAKE_N * SNAKE_N);
const CYCLE_INDEX = new Array<number>(SNAKE_N * SNAKE_N);
for (let i = 0; i < CYCLE.length; i++) {
  const cell = CYCLE[i] ?? 0;
  CYCLE_INDEX[cell] = i;
  CYCLE_NEXT[cell] = CYCLE[(i + 1) % CYCLE.length] ?? cell;
  CYCLE_PREV[cell] = CYCLE[(i - 1 + CYCLE.length) % CYCLE.length] ?? cell;
}

export function cycleNext(cell: number) {
  return CYCLE_NEXT[cell] ?? cell;
}

export function cyclePrev(cell: number) {
  return CYCLE_PREV[cell] ?? cell;
}

/** Forward steps along the cycle, from one cell to another. */
export function cycleSpan(from: number, to: number) {
  const n = SNAKE_N * SNAKE_N;
  return ((CYCLE_INDEX[to] ?? 0) - (CYCLE_INDEX[from] ?? 0) + n) % n;
}

export function cellOf(x: number, y: number) {
  return y * SNAKE_N + x;
}

export function xyOf(cell: number) {
  return { x: cell % SNAKE_N, y: Math.floor(cell / SNAKE_N) };
}

function inBound(cell: number, dir: SnakeDir) {
  const { x, y } = xyOf(cell);
  if (dir === 0) return y > 0;
  if (dir === 1) return x < SNAKE_N - 1;
  if (dir === 2) return y < SNAKE_N - 1;
  return x > 0;
}

export function neighborCell(cell: number, dir: SnakeDir) {
  if (!inBound(cell, dir)) return null;
  return cell + (STEP[dir] ?? 0);
}

export function turnSnake(dir: SnakeDir, turn: -1 | 0 | 1): SnakeDir {
  return ((((dir + turn) % 4) + 4) % 4) as SnakeDir;
}

export function placeFood(body: number[], rng: () => number) {
  const taken = new Set(body);
  const open: number[] = [];
  for (let i = 0; i < SNAKE_N * SNAKE_N; i++) if (!taken.has(i)) open.push(i);
  if (!open.length) return body[0] ?? 0;
  return open[Math.floor(rng() * open.length)] ?? 0;
}

function dirOfStep(from: number, to: number): SnakeDir {
  for (const dir of [0, 1, 2, 3] as const) {
    if (neighborCell(from, dir) === to) return dir;
  }
  return 1;
}

export function newSnake(rng: () => number): SnakeState {
  const head = CYCLE[Math.floor(rng() * CYCLE.length)] ?? 1;
  const neck = cyclePrev(head);
  const tail = cyclePrev(neck);
  const body = [head, neck, tail];
  return { body, dir: dirOfStep(neck, head), food: placeFood(body, rng), score: 0, alive: true };
}

export function stepSnake(state: SnakeState, turn: -1 | 0 | 1, rng: () => number): SnakeState {
  if (!state.alive) return state;
  const dir = turnSnake(state.dir, turn);
  const head = state.body[0] ?? 0;
  if (!inBound(head, dir)) return { ...state, dir, alive: false };
  const nextHead = head + (STEP[dir] ?? 0);
  const grow = nextHead === state.food;
  const nextBody = [nextHead, ...state.body];
  if (!grow) nextBody.pop();
  if (nextBody.slice(1).includes(nextHead)) return { ...state, dir, alive: false };
  return {
    body: nextBody,
    dir,
    food: grow ? placeFood(nextBody, rng) : state.food,
    score: state.score + (grow ? 1 : 0),
    alive: true,
  };
}
