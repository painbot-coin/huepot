/**
 * The house stack book. Weights move on every live lock, then the house
 * sits a short self-play after a human lock. No USDT. No second ranking.
 */

import path from "path";
import { primeJsonFromAtlas } from "@/lib/atlas-json";
import { jsonWritesDone, readJsonFile, writeJsonFile } from "@/lib/durable-json";
import { applyPlacement, COLS, makeRng, newGame, PIECES, ROWS, type Cell } from "@/lib/tetris";
import { FEATURES, pickPlacement, tdUpdate, trainGame } from "@/lib/tetris-ai";
import { HOUSE_STACK_WEIGHTS } from "@/lib/tetris-weights";

const STACK_PATH = path.join(process.cwd(), "data", "tetris-stack.json");

export type StackBook = {
  weights: number[];
  pieces: number;
  games: number;
  userPieces: number;
  housePieces: number;
  bestLines: number;
  updatedAt: number;
};

export function seedBook(): StackBook {
  return {
    weights: [...HOUSE_STACK_WEIGHTS],
    pieces: 0,
    games: 0,
    userPieces: 0,
    housePieces: 0,
    bestLines: 0,
    updatedAt: 0,
  };
}

/** A short live sit. Used only after a human lock, not on every piece. */
export function stackSitHolds(weights: number[], locks = 8) {
  const rng = makeRng(3);
  let state = newGame(rng);
  for (let i = 0; i < locks && state.alive; i++) {
    const place = pickPlacement(state, weights, "live");
    if (!place) return false;
    state = applyPlacement(state, place, rng);
  }
  return state.alive;
}

export function clipWeights(weights: number[]) {
  return Array.from({ length: FEATURES }, (_, i) => {
    const w = Number(weights[i]);
    if (!Number.isFinite(w)) return HOUSE_STACK_WEIGHTS[i] ?? 0;
    return Math.max(-25, Math.min(25, w));
  });
}

export function readCells(raw: unknown): Cell[] | null {
  if (!Array.isArray(raw) || raw.length !== COLS * ROWS) return null;
  const allowed = new Set<string>([...PIECES, "X", ""]);
  const cells: Cell[] = [];
  for (const cell of raw) {
    if (typeof cell !== "string" || !allowed.has(cell)) return null;
    cells.push(cell as Cell);
  }
  return cells;
}

export function applyLesson(
  book: StackBook,
  before: Cell[],
  after: Cell[],
  reward: number,
  source: "user" | "house",
  gameLines = 0,
  gameOver = false,
): StackBook {
  const next: StackBook = {
    ...book,
    weights: clipWeights(tdUpdate(book.weights, before, after, reward)),
    pieces: book.pieces + 1,
    userPieces: book.userPieces + (source === "user" ? 1 : 0),
    housePieces: book.housePieces + (source === "house" ? 1 : 0),
    updatedAt: Date.now(),
  };
  if (gameOver) {
    next.games += 1;
    if (gameLines > next.bestLines) next.bestLines = gameLines;
  }
  return next;
}

export function publicBook(book: StackBook) {
  return {
    weights: book.weights,
    pieces: book.pieces,
    games: book.games,
    userPieces: book.userPieces,
    housePieces: book.housePieces,
    bestLines: book.bestLines,
  };
}

let memory = seedBook();
let loaded = false;
let chain = Promise.resolve();

async function readBook(): Promise<StackBook> {
  if (loaded) return memory;
  await primeJsonFromAtlas();
  const raw = readJsonFile(STACK_PATH, (value) => value as StackBook, () => seedBook());
  memory = {
    ...seedBook(),
    ...raw,
    weights: clipWeights(raw.weights ?? []),
  };
  loaded = true;
  return memory;
}

async function writeBook(book: StackBook) {
  memory = book;
  writeJsonFile(STACK_PATH, book);
  await jsonWritesDone();
}

export function withStackBook<T>(fn: (book: StackBook) => T | Promise<T>) {
  const run = chain.then(async () => {
    const book = await readBook();
    return fn(book);
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function snapshotStack() {
  return withStackBook((book) => publicBook(book));
}

export async function learnStack(input: {
  before: Cell[];
  after: Cell[];
  reward: number;
  source: "user" | "house";
  gameLines?: number;
  gameOver?: boolean;
}) {
  return withStackBook(async (book) => {
    let next = applyLesson(
      book,
      input.before,
      input.after,
      input.reward,
      input.source,
      input.gameLines ?? 0,
      Boolean(input.gameOver),
    );
    if (input.source === "user" && next.userPieces > 0 && next.userPieces % 4 === 0) {
      const trained = trainGame(next.weights, (Date.now() + next.pieces) % 1_000_000_000, 60);
      const taught = clipWeights(trained.weights);
      const weights =
        stackSitHolds(next.weights) && !stackSitHolds(taught) ? clipWeights(next.weights) : taught;
      next = {
        ...next,
        weights,
        pieces: next.pieces + trained.pieces,
        bestLines: Math.max(next.bestLines, trained.lines),
        updatedAt: Date.now(),
      };
    }
    await writeBook(next);
    return publicBook(next);
  });
}
