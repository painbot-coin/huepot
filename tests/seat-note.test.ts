import test from "node:test";
import assert from "node:assert/strict";
import { parseSeatNote, parseSitMark, sitMarkLabel } from "@/lib/seat-note";

test("a note has to say something, and stays short", () => {
  assert.throws(() => parseSeatNote(" "));
  assert.equal(parseSeatNote("  sits late  ").length, 9);
  assert.equal(parseSeatNote("x".repeat(400)).length, 240);
});

test("how they sit is a house mark, not a score", () => {
  assert.equal(parseSitMark("sharp"), "sharp");
  assert.equal(parseSitMark("stars"), "");
  assert.equal(sitMarkLabel("fog"), "Plays Fog");
});
