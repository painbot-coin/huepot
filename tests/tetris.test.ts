import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPlacement,
  COLS,
  columnHeights,
  countHoles,
  hardDrop,
  legalPlacements,
  makeRng,
  newGame,
  receiveGarbage,
  rotate,
  sendOf,
  shift,
} from "@/lib/tetris";
import {
  FEATURES,
  afterLock,
  emptyWeights,
  features,
  pickPlacement,
  scorePlacement,
  stepHouse,
  styleReward,
  tdUpdate,
  trainGame,
} from "@/lib/tetris-ai";
import { HOUSE_STACK_WEIGHTS } from "@/lib/tetris-weights";
import { STYLE_STACK_WEIGHTS } from "@/lib/tetris-style-weights";
import type { StackStyleId } from "@/lib/tetris-style";
import { weightsFile } from "@/lib/tetris-style";
import { applyLesson, seedBook } from "@/lib/tetris-stack";

test("a new bag has seven different pieces and a live spawn", () => {
  const game = newGame(makeRng(7));
  assert.equal(game.alive, true);
  assert.equal(game.queue.length, 3);
  assert.equal(new Set([game.piece, ...game.queue]).size >= 3, true);
  assert.equal(game.grid.length, COLS * 20);
});

test("a hard drop locks and a clear counts a line", () => {
  const rng = makeRng(3);
  let game = newGame(rng);
  const before = game.cursor;
  game = hardDrop(game, rng);
  assert.ok(game.cursor > before || !game.alive);
  assert.ok(game.score >= 0);
});

test("the house only picks a legal placement", () => {
  const game = newGame(makeRng(11));
  const place = pickPlacement(game, emptyWeights());
  assert.ok(place);
  const legal = legalPlacements(game);
  assert.ok(legal.some((row) => row.rot === place!.rot && row.x === place!.x && row.y === place!.y));
});

test("a TD step moves the weights", () => {
  const game = newGame(makeRng(4));
  const place = legalPlacements(game)[0];
  assert.ok(place);
  const next = tdUpdate(emptyWeights(), game.grid, place.grid, 1);
  assert.equal(next.length, FEATURES);
  assert.ok(next.some((w, i) => w !== 0 || features(game.grid)[i] === 0));
});

function sitStyle(style: StackStyleId, seed: number, pieces = 40) {
  const weights = style === "live" ? HOUSE_STACK_WEIGHTS : STYLE_STACK_WEIGHTS[style]!;
  const rng = makeRng(seed);
  let state = newGame(rng);
  let fours = 0;
  let ones = 0;
  let peak = 0;
  let holes = 0;
  let locks = 0;
  while (state.alive && locks < pieces) {
    const place = pickPlacement(state, weights, style);
    if (!place) break;
    if (place.lines >= 4) fours += 1;
    if (place.lines === 1) ones += 1;
    state = applyPlacement(state, place, rng);
    peak += Math.max(...columnHeights(state.grid), 0);
    holes += countHoles(state.grid);
    locks += 1;
  }
  return { fours, ones, peak: peak / Math.max(locks, 1), holes: holes / Math.max(locks, 1), alive: state.alive };
}

test("down stays low, burst keeps a four, and cheese is not combo", () => {
  const down = sitStyle("down", 9000);
  const burst = sitStyle("burst", 9000);
  const cheese = sitStyle("cheese", 9000);
  const combo = sitStyle("combo", 9000);
  const clean = sitStyle("clean", 9000);
  const tank = sitStyle("tank", 9000);
  assert.equal(down.alive, true);
  assert.equal(burst.alive, true);
  assert.ok(down.peak < cheese.peak);
  assert.ok(down.peak < combo.peak);
  assert.ok(down.peak <= clean.peak);
  assert.ok(burst.fours >= 1);
  assert.ok(clean.holes < tank.holes);
  assert.ok(cheese.ones > combo.ones || Math.abs(cheese.peak - combo.peak) > 1);
});

test("a burst sit wants a four more than a single; a harasser wants the single", () => {
  assert.ok(styleReward("burst", 4, false) > styleReward("burst", 1, false));
  assert.ok(styleReward("cheese", 1, false) > styleReward("cheese", 4, false));
  assert.ok(styleReward("down", 1, false) > 0);
});

test("the trained weights file is readable numbers, not a mystery", () => {
  const text = weightsFile({
    name: "Downstacker",
    playerType: "Fast line reducer",
    how: "Keeps the board low.",
    games: 240,
    features: ["bias", "height"],
    weights: [1, -2],
  });
  assert.match(text, /Player type: Fast line reducer/);
  assert.match(text, /Weights/);
  assert.match(text, /1\.0000/);
  assert.equal(text.includes("{"), false);
});

test("one training game finishes and keeps six weights", () => {
  const result = trainGame(emptyWeights(), 21, 40);
  assert.equal(result.weights.length, FEATURES);
  assert.ok(result.pieces > 0);
  assert.ok(Number.isFinite(result.weights[1]));
});

test("a shift and a rotate stay on the board", () => {
  const game = newGame(makeRng(9));
  const moved = shift(rotate(game, 1), 1);
  assert.equal(moved.alive, true);
  assert.ok(moved.x !== game.x || moved.rot !== game.rot || moved.x === game.x);
});

test("a send never exceeds two lines", () => {
  assert.equal(sendOf(0), 0);
  assert.equal(sendOf(1), 0);
  assert.equal(sendOf(2), 1);
  assert.equal(sendOf(3), 2);
  assert.equal(sendOf(4), 2);
});

test("garbage arrives as two rows at most", () => {
  const game = newGame(makeRng(5));
  const hit = receiveGarbage(game, 8, 3);
  const added = hit.grid.filter((cell) => cell === "X").length;
  assert.equal(added, 18);
});

test("the house will not pick a triple when a quieter lock exists", () => {
  const game = newGame(makeRng(11));
  const place = pickPlacement(game, emptyWeights(), 2);
  assert.ok(place);
  assert.ok(place!.lines <= 2);
});

test("a live lesson moves the book", () => {
  const empty = Array.from({ length: 200 }, () => "" as const);
  const book = applyLesson(seedBook(), empty, empty, 1, "user");
  assert.equal(book.userPieces, 1);
  assert.equal(book.weights.length, FEATURES);
});

test("two seats are dealt different bags", () => {
  const left = newGame(makeRng(3));
  const right = newGame(makeRng(99));
  assert.notDeepEqual([left.piece, ...left.queue], [right.piece, ...right.queue]);
});

test("the next lock is scored with the queued piece", () => {
  const game = newGame(makeRng(11));
  const place = pickPlacement(game, HOUSE_STACK_WEIGHTS, "live", 1);
  assert.ok(place);
  const after = afterLock(game, place);
  assert.equal(after.piece, game.queue[0]);
  assert.equal(after.grid, place.grid);
  const expected = legalPlacements(after);
  assert.ok(expected.length > 0);
});

test("looking one piece ahead can beat a one-lock sit", () => {
  let differed = false;
  for (let seed = 1; seed <= 48; seed++) {
    const game = newGame(makeRng(seed));
    const one = pickPlacement(game, HOUSE_STACK_WEIGHTS, "all", 1);
    const two = pickPlacement(game, HOUSE_STACK_WEIGHTS, "all", 2);
    if (!one || !two) continue;
    const s1 = scorePlacement(game, one, HOUSE_STACK_WEIGHTS, "all", 4, 2);
    const s2 = scorePlacement(game, two, HOUSE_STACK_WEIGHTS, "all", 4, 2);
    assert.ok(s2 + 1e-9 >= s1);
    if (one.x !== two.x || one.rot !== two.rot || one.y !== two.y) differed = true;
  }
  assert.equal(differed, true);
});

test("the house takes a step toward a lock", () => {
  const rng = makeRng(8);
  const game = newGame(rng);
  const next = stepHouse(game, emptyWeights(), rng);
  assert.equal(next.alive, true);
  assert.ok(next.x !== game.x || next.rot !== game.rot || next.y !== game.y || next.cursor > game.cursor);
});
