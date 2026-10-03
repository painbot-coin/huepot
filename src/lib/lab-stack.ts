/**
 * Live books for wait-lab games that are not the stack.
 * Catch, snake, aim, lane, and break train here. No USDT. No second ranking.
 */

import path from "path";
import { primeJsonFromAtlas } from "@/lib/atlas-json";
import { jsonWritesDone, readJsonFile, writeJsonFile } from "@/lib/durable-json";
import { AIM_FEATURE_COUNT, aimTd, trainAim } from "@/lib/aim-ai";
import { AIM_FIRST_WEIGHTS } from "@/lib/aim-weights";
import { CATCH_FEATURE_COUNT, catchTd, trainCatch } from "@/lib/catch-ai";
import { CATCH_FIRST_WEIGHTS } from "@/lib/catch-weights";
import { BREAK_FEATURE_COUNT, breakTd, trainBreak } from "@/lib/break-ai";
import { BREAK_FIRST_WEIGHTS } from "@/lib/break-weights";
import { LANE_FEATURE_COUNT, laneTd, trainLane } from "@/lib/lane-ai";
import { LANE_FIRST_WEIGHTS } from "@/lib/lane-weights";
import { keepHeldSit } from "@/lib/lab-train";
import { SNAKE_FEATURE_COUNT, snakeTd, trainSnake } from "@/lib/snake-ai";
import { SNAKE_FIRST_WEIGHTS } from "@/lib/snake-weights";

const LAB_PATH = path.join(process.cwd(), "data", "lab-stack.json");

export type LabId = "catch" | "snake" | "aim" | "lane" | "break";

export type LabBook = {
  weights: number[];
  pieces: number;
  games: number;
  userPieces: number;
  housePieces: number;
  bestScore: number;
  updatedAt: number;
};

export type LabLedger = Record<LabId, LabBook>;

const LAB = {
  catch: { count: CATCH_FEATURE_COUNT, fallback: CATCH_FIRST_WEIGHTS, td: catchTd, train: trainCatch },
  snake: { count: SNAKE_FEATURE_COUNT, fallback: SNAKE_FIRST_WEIGHTS, td: snakeTd, train: trainSnake },
  aim: { count: AIM_FEATURE_COUNT, fallback: AIM_FIRST_WEIGHTS, td: aimTd, train: trainAim },
  lane: { count: LANE_FEATURE_COUNT, fallback: LANE_FIRST_WEIGHTS, td: laneTd, train: trainLane },
  break: { count: BREAK_FEATURE_COUNT, fallback: BREAK_FIRST_WEIGHTS, td: breakTd, train: trainBreak },
} as const;

function seedBook(id: LabId): LabBook {
  return {
    weights: [...LAB[id].fallback],
    pieces: 0,
    games: 0,
    userPieces: 0,
    housePieces: 0,
    bestScore: 0,
    updatedAt: 0,
  };
}

export function seedLab(): LabLedger {
  return {
    catch: seedBook("catch"),
    snake: seedBook("snake"),
    aim: seedBook("aim"),
    lane: seedBook("lane"),
    break: seedBook("break"),
  };
}

function clip(weights: number[], fallback: number[], count: number) {
  return Array.from({ length: count }, (_, i) => {
    const w = Number(weights[i]);
    if (!Number.isFinite(w)) return fallback[i] ?? 0;
    return Math.max(-25, Math.min(25, w));
  });
}

function readPhi(raw: unknown, count: number) {
  if (!Array.isArray(raw) || raw.length !== count) return null;
  const phi: number[] = [];
  for (const n of raw) {
    const v = Number(n);
    if (!Number.isFinite(v)) return null;
    phi.push(v);
  }
  return phi;
}

export function deepenLab(book: LabBook, game: LabId, seed: number, maxSteps = 60): LabBook {
  const spec = LAB[game];
  const trained = spec.train(book.weights, seed, maxSteps);
  return {
    ...book,
    weights: keepHeldSit(game, book.weights, trained.weights),
    pieces: book.pieces + trained.steps,
    bestScore: Math.max(book.bestScore, trained.score),
    updatedAt: book.updatedAt,
  };
}

export function publicLab(book: LabBook) {
  return {
    weights: book.weights,
    pieces: book.pieces,
    games: book.games,
    userPieces: book.userPieces,
    housePieces: book.housePieces,
    bestScore: book.bestScore,
    bestLines: book.bestScore,
  };
}

let memory = seedLab();
let loaded = false;
let chain = Promise.resolve();

function hydrate(id: LabId, raw?: LabBook) {
  const spec = LAB[id];
  return {
    ...seedBook(id),
    ...raw,
    weights: clip(raw?.weights ?? [], spec.fallback, spec.count),
  };
}

async function readLab(): Promise<LabLedger> {
  if (loaded) return memory;
  await primeJsonFromAtlas();
  const raw = readJsonFile(
    LAB_PATH,
    (value) => (value ?? {}) as Partial<LabLedger>,
    (): Partial<LabLedger> => ({}),
  );
  memory = {
    catch: hydrate("catch", raw.catch),
    snake: hydrate("snake", raw.snake),
    aim: hydrate("aim", raw.aim),
    lane: hydrate("lane", raw.lane),
    break: hydrate("break", raw.break),
  };
  loaded = true;
  return memory;
}

async function writeLab(lab: LabLedger) {
  memory = lab;
  writeJsonFile(LAB_PATH, lab);
  await jsonWritesDone();
}

function withLab<T>(fn: (lab: LabLedger) => T | Promise<T>) {
  const run = chain.then(async () => fn(await readLab()));
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function snapshotLab(game: LabId) {
  return withLab((lab) => publicLab(lab[game]));
}

export async function snapshotLabs() {
  return withLab((lab) => ({
    catch: publicLab(lab.catch),
    snake: publicLab(lab.snake),
    aim: publicLab(lab.aim),
    lane: publicLab(lab.lane),
    break: publicLab(lab.break),
  }));
}

export async function learnLab(input: {
  game: LabId;
  before: unknown;
  after: unknown;
  reward: number;
  source: "user" | "house";
  score?: number;
  gameOver?: boolean;
}) {
  const spec = LAB[input.game];
  const before = readPhi(input.before, spec.count);
  const after = readPhi(input.after, spec.count);
  if (!before || !after) return null;
  return withLab(async (lab) => {
    const book = lab[input.game];
    let next: LabBook = {
      ...book,
      weights: keepHeldSit(
        input.game,
        book.weights,
        clip(spec.td(book.weights, before, after, input.reward), spec.fallback, spec.count),
      ),
      pieces: book.pieces + 1,
      userPieces: book.userPieces + (input.source === "user" ? 1 : 0),
      housePieces: book.housePieces + (input.source === "house" ? 1 : 0),
      updatedAt: Date.now(),
    };
    if (input.gameOver) {
      next.games += 1;
      next.bestScore = Math.max(next.bestScore, input.score ?? 0);
    }
    if (input.source === "user" && next.userPieces > 0 && next.userPieces % 4 === 0) {
      next = deepenLab(next, input.game, (Date.now() + next.pieces) % 1_000_000_000);
      next.updatedAt = Date.now();
    }
    const ledger = { ...lab, [input.game]: next };
    await writeLab(ledger);
    return publicLab(next);
  });
}

export function isLabId(value: string): value is LabId {
  return value === "catch" || value === "snake" || value === "aim" || value === "lane" || value === "break";
}
