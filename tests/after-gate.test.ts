import test from "node:test";
import assert from "node:assert/strict";
import { afterGatePath, needsSeatPath } from "@/lib/after-gate";
import { safeNext } from "@/lib/next-path";

test("a new seat is sent to the four cards, never past them", () => {
  assert.equal(afterGatePath("", "/"), "/seat");
  assert.equal(afterGatePath("", ""), "/seat");
  assert.equal(afterGatePath("", "/network"), "/seat?next=%2Fnetwork");
  assert.equal(afterGatePath("", "/network/u/ana"), "/seat?next=%2Fnetwork%2Fu%2Fana");
  assert.equal(afterGatePath("", "/wait/store"), "/seat?next=%2Fwait%2Fstore");
  assert.equal(afterGatePath("", "/wait?sit=catch-first"), "/seat?next=%2Fwait%3Fsit%3Dcatch-first");
  assert.equal(afterGatePath("game", "/wait?sit=catch-deep"), "/wait?sit=catch-deep");
  assert.equal(afterGatePath("", "/seat"), "/seat");
  assert.equal(afterGatePath("game", "/wait"), "/wait");
  assert.equal(afterGatePath("ai", "/"), "/");
  assert.equal(afterGatePath("host", "/network"), "/seat?next=%2Fnetwork");
});

test("the hall, the wing, and the wait need a named seat", () => {
  assert.equal(needsSeatPath("/"), true);
  assert.equal(needsSeatPath("/network"), true);
  assert.equal(needsSeatPath("/network/people"), true);
  assert.equal(needsSeatPath("/network/u/ana"), true);
  assert.equal(needsSeatPath("/wait"), true);
  assert.equal(needsSeatPath("/wait?sit=catch-first"), true);
  assert.equal(needsSeatPath("/wait/store"), true);
  assert.equal(needsSeatPath("/seat"), false);
  assert.equal(needsSeatPath("/account"), false);
  assert.equal(needsSeatPath("/withdraw"), false);
  assert.equal(needsSeatPath("/how-it-works"), false);
  assert.equal(needsSeatPath("/jobs"), false);
  assert.equal(needsSeatPath("/jobs/lane"), false);
  assert.equal(needsSeatPath("/jobs/you"), false);
  assert.equal(needsSeatPath("/manage"), false);
  assert.equal(needsSeatPath("/signin"), false);
  assert.equal(needsSeatPath("/rooms/classic"), false);
});

test("the gate may send someone back to the seat cards", () => {
  assert.equal(safeNext("/seat"), "/seat");
  assert.equal(safeNext("/seat?next=/network"), "/seat?next=/network");
});
