/**
 * A short house sit you can watch. No TD. No USDT.
 * Gold is only to take a priced file home.
 */

import { AIM_N, newAim } from "@/lib/aim";
import { stepAimHouse } from "@/lib/aim-ai";
import { BREAK_COLS, BREAK_PAD, BREAK_ROWS, brickOn, newBreak } from "@/lib/break";
import { stepBreakHouse } from "@/lib/break-ai";
import { CATCH_COLS, CATCH_PAD, CATCH_ROWS, newCatch } from "@/lib/catch";
import { stepCatchHouse } from "@/lib/catch-ai";
import {
  AGENT_BOOKS,
  canWatchMark,
  markById,
  priceLabel,
  type MarkKind,
} from "@/lib/house-mark-list";
import { labRng } from "@/lib/lab-rng";
import { LANE_N, newLane } from "@/lib/lane";
import { stepLaneHouse } from "@/lib/lane-ai";
import { newSnake, SNAKE_N } from "@/lib/snake";
import { stepSnakeHouse } from "@/lib/snake-ai";
import { applyPlacement, cellsOf, COLS, newGame, ROWS, type TetrisState } from "@/lib/tetris";
import { pickPlacement } from "@/lib/tetris-ai";
import { stackStyleByMark, type StackStyleId } from "@/lib/tetris-style";

export const WATCH_STEPS = 36;
export const WATCH_STACK_LOCKS = 12;

export type WatchFrame = {
  cols: number;
  rows: number;
  cells: number[];
  score: number;
  note: string;
  alive: boolean;
};

export type WatchSit = {
  id: string;
  kind: MarkKind;
  steps: number;
  score: number;
  frames: WatchFrame[];
};

function frame(cols: number, rows: number, cells: number[], score: number, note: string, alive: boolean): WatchFrame {
  return { cols, rows, cells, score, note, alive };
}

function catchFrame(state: ReturnType<typeof newCatch>) {
  const cells = Array.from({ length: CATCH_COLS * CATCH_ROWS }, () => 0);
  if (state.alive) cells[state.tokenY * CATCH_COLS + state.tokenX] = 2;
  for (let i = 0; i < CATCH_PAD; i++) cells[(CATCH_ROWS - 1) * CATCH_COLS + state.paddle + i] = 3;
  return frame(CATCH_COLS, CATCH_ROWS, cells, state.score, `${state.misses} miss`, state.alive);
}

function snakeFrame(state: ReturnType<typeof newSnake>) {
  const cells = Array.from({ length: SNAKE_N * SNAKE_N }, () => 0);
  for (const cell of state.body) cells[cell] = 1;
  if (state.body[0] !== undefined) cells[state.body[0]] = 2;
  cells[state.food] = 3;
  return frame(SNAKE_N, SNAKE_N, cells, state.score, "ate", state.alive);
}

function aimFrame(state: ReturnType<typeof newAim>) {
  const cells = Array.from({ length: AIM_N * AIM_N }, () => 0);
  cells[state.target] = 2;
  cells[state.cursor] = 3;
  return frame(AIM_N, AIM_N, cells, state.score, `${state.misses} miss`, state.alive);
}

function laneFrame(state: ReturnType<typeof newLane>) {
  const cells = Array.from({ length: LANE_N }, (_, i) => {
    const pos = LANE_N - 1 - i;
    if (state.alive && pos === state.pos) return state.hp === 1 ? 4 : 2;
    if (pos === 0) return 1;
    return 0;
  });
  return frame(1, LANE_N, cells, state.score, `${state.misses} miss`, state.alive);
}

function breakFrame(state: ReturnType<typeof newBreak>) {
  const cells = Array.from({ length: BREAK_COLS * BREAK_ROWS }, () => 0);
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < BREAK_COLS; x++) {
      if (brickOn(state.bricks, x, y)) cells[y * BREAK_COLS + x] = 1;
    }
  }
  if (state.alive) cells[state.ballY * BREAK_COLS + state.ballX] = 2;
  for (let i = 0; i < BREAK_PAD; i++) cells[(BREAK_ROWS - 1) * BREAK_COLS + state.paddle + i] = 3;
  return frame(BREAK_COLS, BREAK_ROWS, cells, state.score, `${state.misses} miss`, state.alive);
}

function stackFrame(state: TetrisState) {
  const cells: number[] = state.grid.map((cell) => (cell ? 1 : 0));
  if (state.alive) {
    for (const cell of cellsOf(state.piece, state.rot, state.x, state.y)) {
      if (cell.y >= 0 && cell.y < ROWS) cells[cell.y * COLS + cell.x] = 2;
    }
  }
  return frame(COLS, ROWS, cells, state.lines, `${state.lines} lines`, state.alive);
}

function runWatch(
  kind: MarkKind,
  start: WatchFrame,
  step: () => WatchFrame,
  maxSteps: number,
) {
  const frames = [start];
  let steps = 0;
  while (frames[frames.length - 1]!.alive && steps < maxSteps) {
    frames.push(step());
    steps += 1;
  }
  return { kind, steps, score: frames[frames.length - 1]!.score, frames };
}

export function watchLabSit(
  kind: MarkKind,
  weights: number[],
  seed: number,
  style: StackStyleId = "live",
  maxSteps = kind === "wait" ? WATCH_STACK_LOCKS : WATCH_STEPS,
) {
  const rng = labRng(seed);
  if (kind === "catch") {
    let state = newCatch(rng);
    return runWatch(kind, catchFrame(state), () => {
      state = stepCatchHouse(state, weights, rng);
      return catchFrame(state);
    }, maxSteps);
  }
  if (kind === "snake") {
    let state = newSnake(rng);
    return runWatch(kind, snakeFrame(state), () => {
      state = stepSnakeHouse(state, weights, rng);
      return snakeFrame(state);
    }, maxSteps);
  }
  if (kind === "aim") {
    let state = newAim(rng);
    return runWatch(kind, aimFrame(state), () => {
      state = stepAimHouse(state, weights, rng);
      return aimFrame(state);
    }, maxSteps);
  }
  if (kind === "lane") {
    let state = newLane(rng);
    return runWatch(kind, laneFrame(state), () => {
      state = stepLaneHouse(state, weights, rng);
      return laneFrame(state);
    }, maxSteps);
  }
  if (kind === "break") {
    let state = newBreak(rng);
    return runWatch(kind, breakFrame(state), () => {
      state = stepBreakHouse(state, weights, rng);
      return breakFrame(state);
    }, maxSteps);
  }
  let state = newGame(rng);
  return runWatch(kind, stackFrame(state), () => {
    const place = pickPlacement(state, weights, style);
    if (!place) {
      state = { ...state, alive: false };
      return stackFrame(state);
    }
    state = applyPlacement(state, place, rng);
    return stackFrame(state);
  }, maxSteps);
}

export function watchMarkSit(id: string, weights: number[], seed: number) {
  const mark = markById(id);
  if (!mark || !canWatchMark(mark) || !weights.length) return null;
  const sit = watchLabSit(mark.kind, weights, seed, stackStyleByMark(id).id);
  return { ...sit, id };
}

/** One seed per book, so the card, the watch, and the file are the same sit. */
export function shelfSeed(id: string) {
  let n = 2166136261;
  for (let i = 0; i < id.length; i++) {
    n ^= id.charCodeAt(i);
    n = Math.imul(n, 16777619);
  }
  return (n >>> 0) % 900_000 + 1;
}

export type AgentSit = {
  id: string;
  label: string;
  how: string;
  priceCents: number;
  priceLabel: string;
  kind: MarkKind;
  steps: number;
  score: number;
  note: string;
  frames: WatchFrame[];
};

let cachedAgents: AgentSit[] | null = null;

/** The seven cards. Same seed as the file, so the watch on the card is that book. */
export function agentSits(weightsOf: (id: string) => number[] | null) {
  if (cachedAgents) return cachedAgents;
  const sits: AgentSit[] = [];
  for (const book of AGENT_BOOKS) {
    const mark = markById(book.id);
    const weights = weightsOf(book.id);
    if (!mark || mark.status !== "live" || !weights?.length) continue;
    const sit = watchMarkSit(book.id, weights, shelfSeed(book.id));
    if (!sit) continue;
    const last = sit.frames[sit.frames.length - 1];
    sits.push({
      id: book.id,
      label: book.label,
      how: mark.how,
      priceCents: mark.priceCents,
      priceLabel: priceLabel(mark.priceCents),
      kind: sit.kind,
      steps: sit.steps,
      score: sit.score,
      note: last?.note ?? "",
      frames: sit.frames,
    });
  }
  if (sits.length === AGENT_BOOKS.length) cachedAgents = sits;
  return sits;
}

export function shelfSit(id: string, weights: number[]) {
  const sit = watchMarkSit(id, weights, shelfSeed(id));
  if (!sit) return null;
  const last = sit.frames[sit.frames.length - 1];
  return {
    score: sit.score,
    note: last?.note ?? "",
    weights: [...weights],
  };
}
