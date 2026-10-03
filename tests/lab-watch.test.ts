import assert from "node:assert/strict";
import test from "node:test";
import { CATCH_DEEP_WEIGHTS, CATCH_FIRST_WEIGHTS } from "@/lib/catch-weights";
import { SNAKE_DEEP_WEIGHTS } from "@/lib/snake-weights";
import { canDownloadWeights, canWatchMark, markById } from "@/lib/house-mark-list";
import { shelfSeed, shelfSit, watchLabSit, watchMarkSit } from "@/lib/lab-watch";
import { weightsFile } from "@/lib/tetris-style";
import { STYLE_STACK_WEIGHTS } from "@/lib/tetris-style-weights";

test("a short house watch keeps the board and does not move the weights", () => {
  const start = [...CATCH_FIRST_WEIGHTS];
  const sit = watchLabSit("catch", start, 11, "live", 12);
  assert.ok(sit.frames.length >= 2);
  assert.equal(sit.frames[0]!.cols, 10);
  assert.equal(sit.frames[0]!.cells.length, 10 * 12);
  assert.ok(Number.isFinite(sit.score));
  assert.ok(sit.steps > 0);
  assert.deepEqual(start, CATCH_FIRST_WEIGHTS);
});

test("a snake watch counts the food", () => {
  const sit = watchLabSit("snake", SNAKE_DEEP_WEIGHTS, 7, "live", 36);
  assert.ok(sit);
  assert.ok(sit.frames.length >= 2);
  assert.ok(sit.frames.every((frame) => frame.note === "ate"));
  assert.equal(sit.score, sit.frames[sit.frames.length - 1]!.score);
  assert.equal(sit.frames[0]!.alive, true);
  assert.ok(sit.score >= 1);
});

test("anyone may watch a priced sit; gold is only to take the file", () => {
  const deep = markById("catch-deep")!;
  assert.equal(canWatchMark(deep), true);
  assert.equal(canDownloadWeights(deep, []), false);
  const sit = watchMarkSit("catch-deep", CATCH_DEEP_WEIGHTS, 7);
  assert.ok(sit);
  assert.equal(sit.id, "catch-deep");
  assert.equal(sit.kind, "catch");
  assert.ok(sit.frames.length >= 2);
});

test("the shelf card and the file are the same sit", () => {
  const once = shelfSit("snake-deep", SNAKE_DEEP_WEIGHTS);
  const again = shelfSit("snake-deep", SNAKE_DEEP_WEIGHTS);
  assert.ok(once);
  assert.ok(again);
  assert.equal(again.score, once.score);
  assert.equal(again.note, "ate");
  assert.equal(shelfSeed("snake-deep"), shelfSeed("snake-deep"));
  assert.notEqual(shelfSeed("snake-deep"), shelfSeed("snake-first"));
  const text = weightsFile({
    name: "Snake deep sit",
    how: "Cuts toward food while the tail stays open.",
    weights: once.weights,
    watchScore: once.score,
    watchNote: once.note,
  });
  assert.match(text, new RegExp(`Watch: ${once.score} · ate`));
  assert.ok(text.includes(once.weights[0]!.toFixed(4)));
  const burst = shelfSit("wait-burst", STYLE_STACK_WEIGHTS.burst);
  assert.ok(burst);
  const burstFile = weightsFile({
    name: "Burst",
    weights: burst.weights,
    watchScore: burst.score,
    watchNote: burst.note,
    style: "burst",
  });
  assert.match(burstFile, /Style: burst/);
  assert.match(burstFile, new RegExp(`Watch: ${burst.score}`));
});

test("a frozen stack sit can play a short house watch", () => {
  const sit = watchMarkSit("wait-down", STYLE_STACK_WEIGHTS.down, 5);
  assert.ok(sit);
  assert.equal(sit.kind, "wait");
  assert.ok(sit.steps > 0);
  assert.equal(sit.frames[0]!.cols, 10);
  assert.equal(sit.frames[0]!.rows, 20);
});
