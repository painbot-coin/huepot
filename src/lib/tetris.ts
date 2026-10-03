/** A quiet stack. No USDT. The house plays the other board. */

export const COLS = 10;
export const ROWS = 20;

export const PIECES = ["I", "O", "T", "S", "Z", "J", "L"] as const;
export type PieceId = (typeof PIECES)[number];

const SHAPES: Record<PieceId, number[][][]> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
};

export type Cell = PieceId | "X" | "";

export type TetrisState = {
  grid: Cell[];
  piece: PieceId;
  rot: number;
  x: number;
  y: number;
  queue: PieceId[];
  bag: PieceId[];
  cursor: number;
  lines: number;
  score: number;
  alive: boolean;
};

export function makeRng(seed: number) {
  let t = seed >>> 0 || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyGrid(): Cell[] {
  return Array.from({ length: COLS * ROWS }, () => "");
}

function refillBag(rng: () => number): PieceId[] {
  const bag: PieceId[] = [...PIECES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = bag[i]!;
    bag[i] = bag[j]!;
    bag[j] = a;
  }
  return bag;
}

function takePiece(queue: PieceId[], bag: PieceId[], rng: () => number) {
  const nextBag = bag.length ? bag : refillBag(rng);
  const nextQueue = queue.length ? queue : [];
  while (nextQueue.length < 3) {
    if (!nextBag.length) nextBag.push(...refillBag(rng));
    nextQueue.push(nextBag.shift()!);
  }
  const piece = nextQueue.shift()!;
  while (nextQueue.length < 3) {
    if (!nextBag.length) nextBag.push(...refillBag(rng));
    nextQueue.push(nextBag.shift()!);
  }
  return { piece, queue: nextQueue, bag: nextBag };
}

export function cellsOf(piece: PieceId, rot: number, x: number, y: number) {
  return SHAPES[piece][rot % 4]!.map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
}

export function blocked(grid: Cell[], piece: PieceId, rot: number, x: number, y: number) {
  return cellsOf(piece, rot, x, y).some(
    (cell) =>
      cell.x < 0 ||
      cell.x >= COLS ||
      cell.y >= ROWS ||
      (cell.y >= 0 && grid[cell.y * COLS + cell.x]),
  );
}

function spawn(grid: Cell[], piece: PieceId) {
  const x = 3;
  const y = piece === "I" ? -1 : 0;
  return { x, y, ok: !blocked(grid, piece, 0, x, y) };
}

export function newGame(rng: () => number): TetrisState {
  const taken = takePiece([], [], rng);
  const born = spawn(emptyGrid(), taken.piece);
  return {
    grid: emptyGrid(),
    piece: taken.piece,
    rot: 0,
    x: born.x,
    y: born.y,
    queue: taken.queue,
    bag: taken.bag,
    cursor: 0,
    lines: 0,
    score: 0,
    alive: born.ok,
  };
}

export function ghostY(state: TetrisState) {
  let y = state.y;
  while (!blocked(state.grid, state.piece, state.rot, state.x, y + 1)) y += 1;
  return y;
}

function lockPiece(state: TetrisState, rng: () => number): TetrisState {
  const grid = [...state.grid];
  for (const cell of cellsOf(state.piece, state.rot, state.x, state.y)) {
    if (cell.y < 0) return { ...state, alive: false };
    grid[cell.y * COLS + cell.x] = state.piece;
  }
  const cleared: Cell[] = [];
  let lines = 0;
  for (let row = 0; row < ROWS; row++) {
    const start = row * COLS;
    const full = grid.slice(start, start + COLS).every(Boolean);
    if (full) {
      lines += 1;
      continue;
    }
    cleared.push(...grid.slice(start, start + COLS));
  }
  while (cleared.length < COLS * ROWS) cleared.unshift("");
  const taken = takePiece(state.queue, state.bag, rng);
  const born = spawn(cleared, taken.piece);
  const points = lines === 1 ? 1 : lines === 2 ? 3 : lines === 3 ? 5 : lines === 4 ? 8 : 0;
  return {
    grid: cleared,
    piece: taken.piece,
    rot: 0,
    x: born.x,
    y: born.y,
    queue: taken.queue,
    bag: taken.bag,
    cursor: state.cursor + 1,
    lines: state.lines + lines,
    score: state.score + points,
    alive: born.ok,
  };
}

export function shift(state: TetrisState, dx: number): TetrisState {
  if (!state.alive) return state;
  const x = state.x + dx;
  if (blocked(state.grid, state.piece, state.rot, x, state.y)) return state;
  return { ...state, x };
}

export function rotate(state: TetrisState, dir: 1 | -1): TetrisState {
  if (!state.alive) return state;
  const rot = (state.rot + dir + 4) % 4;
  for (const kick of [0, -1, 1, -2, 2]) {
    if (!blocked(state.grid, state.piece, rot, state.x + kick, state.y)) {
      return { ...state, rot, x: state.x + kick };
    }
  }
  return state;
}

export function softDrop(state: TetrisState, rng: () => number): TetrisState {
  if (!state.alive) return state;
  if (!blocked(state.grid, state.piece, state.rot, state.x, state.y + 1)) {
    return { ...state, y: state.y + 1 };
  }
  return lockPiece(state, rng);
}

export function hardDrop(state: TetrisState, rng: () => number): TetrisState {
  if (!state.alive) return state;
  return lockPiece({ ...state, y: ghostY(state) }, rng);
}

export type Placement = { rot: number; x: number; y: number; lines: number; grid: Cell[] };

export function boardAfter(state: TetrisState, rot: number, x: number, y: number) {
  const grid = [...state.grid];
  for (const cell of cellsOf(state.piece, rot, x, y)) {
    if (cell.y < 0) return { grid, lines: 0, buried: true };
    grid[cell.y * COLS + cell.x] = state.piece;
  }
  const kept: Cell[] = [];
  let lines = 0;
  for (let row = 0; row < ROWS; row++) {
    const start = row * COLS;
    if (grid.slice(start, start + COLS).every(Boolean)) {
      lines += 1;
      continue;
    }
    kept.push(...grid.slice(start, start + COLS));
  }
  while (kept.length < COLS * ROWS) kept.unshift("");
  return { grid: kept, lines, buried: false };
}

export function legalPlacements(state: TetrisState): Placement[] {
  if (!state.alive) return [];
  const out: Placement[] = [];
  const seen = new Set<string>();
  for (let rot = 0; rot < 4; rot++) {
    for (let x = -3; x < COLS; x++) {
      if (blocked(state.grid, state.piece, rot, x, -2)) continue;
      let y = -2;
      while (!blocked(state.grid, state.piece, rot, x, y + 1)) y += 1;
      const after = boardAfter(state, rot, x, y);
      if (after.buried) continue;
      const key = `${rot}:${x}:${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ rot, x, y, lines: after.lines, grid: after.grid });
    }
  }
  return out;
}

export function applyPlacement(state: TetrisState, place: Placement, rng: () => number) {
  if (!state.alive) return state;
  return lockPiece({ ...state, rot: place.rot, x: place.x, y: place.y }, rng);
}

export function towardPlacement(state: TetrisState, place: Placement) {
  if (state.rot !== place.rot) return "rot" as const;
  if (state.x < place.x) return "right" as const;
  if (state.x > place.x) return "left" as const;
  return "drop" as const;
}

export function columnHeights(grid: Cell[]) {
  const heights = Array.from({ length: COLS }, () => 0);
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (grid[y * COLS + x]) {
        heights[x] = ROWS - y;
        break;
      }
    }
  }
  return heights;
}

export function countHoles(grid: Cell[]) {
  let holes = 0;
  for (let x = 0; x < COLS; x++) {
    let seen = false;
    for (let y = 0; y < ROWS; y++) {
      if (grid[y * COLS + x]) seen = true;
      else if (seen) holes += 1;
    }
  }
  return holes;
}

export function bumpiness(heights: number[]) {
  let sum = 0;
  for (let i = 0; i < heights.length - 1; i++) {
    sum += Math.abs((heights[i] ?? 0) - (heights[i + 1] ?? 0));
  }
  return sum;
}

/** A double sends one. Triple and tetris still send two. Never more. */
export function sendOf(lines: number) {
  if (lines <= 1) return 0;
  if (lines === 2) return 1;
  return 2;
}

export function addGarbage(grid: Cell[], rows: number, gap: number): Cell[] {
  const n = Math.max(0, Math.min(2, Math.floor(rows)));
  if (!n) return grid;
  const hole = ((gap % COLS) + COLS) % COLS;
  const next = grid.slice(n * COLS);
  for (let row = 0; row < n; row++) {
    for (let x = 0; x < COLS; x++) next.push(x === hole ? "" : "X");
  }
  return next;
}

export function receiveGarbage(state: TetrisState, rows: number, gap: number): TetrisState {
  const n = Math.max(0, Math.min(2, Math.floor(rows)));
  if (!n) return state;
  const grid = addGarbage(state.grid, n, gap);
  if (!blocked(grid, state.piece, state.rot, state.x, state.y)) {
    return { ...state, grid };
  }
  if (!blocked(grid, state.piece, state.rot, state.x, state.y - n)) {
    return { ...state, grid, y: state.y - n };
  }
  return { ...state, grid, alive: false };
}
