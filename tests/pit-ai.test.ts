import test from "node:test";
import assert from "node:assert/strict";
import { pickColor, PIT_RULES, settleLine, trainBook, winnersOf } from "@/lib/pit-ai";
import { CLASSIC_DEEP_WEIGHTS, FOG_DEEP_WEIGHTS } from "@/lib/pit-weights";

test("a deep classic sit picks the leading color late", () => {
  const pick = pickColor([3, 8, 2, 1], 4, 60, false, CLASSIC_DEEP_WEIGHTS);
  assert.equal(pick.action, 1);
  assert.ok((pick.scores[1] ?? 0) > (pick.scores[0] ?? 0));
});

test("a fog sit still uses the last seen board in the dark", () => {
  const seen = [2, 6, 1, 1];
  const pick = pickColor(seen, 5, 60, true, FOG_DEEP_WEIGHTS);
  assert.equal(pick.action, 1);
});

test("a unique leader takes; a tie comes back", () => {
  assert.deepEqual(winnersOf([1, 4, 2, 1]), [1]);
  assert.deepEqual(winnersOf([3, 3, 1, 0]), []);
});

test("a sit names who sat the taking color", () => {
  const names = ["Crimson", "Azure", "Volt", "Amber"];
  assert.equal(settleLine([1, 4, 2, 1], [0, 3, 0, 0], [1, 1, 2, 1], names, false), "You sat Azure.");
  assert.equal(settleLine([1, 4, 2, 1], [0, 1, 0, 0], [1, 3, 2, 1], names, false), "The book sat Azure.");
  assert.equal(settleLine([3, 3, 1, 0], [2, 1, 0, 0], [1, 2, 1, 0], names, false), "A tie comes back. Nobody took.");
  assert.equal(settleLine([1, 5, 1, 1], [0, 2, 0, 0], [0, 3, 0, 0], names, true), "East sat Azure.");
});

test("a TD sit keeps six weights", () => {
  const book = trainBook(PIT_RULES.classic, 8, 3);
  assert.equal(book.weights.length, 6);
  assert.ok(book.weights.every((n) => Number.isFinite(n)));
});
