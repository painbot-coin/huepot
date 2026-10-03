import test from "node:test";
import assert from "node:assert/strict";
import {
  eveningBookHref,
  eveningBookId,
  eveningCopy,
  eveningHere,
  eveningSteps,
} from "@/lib/evening-path";
import { LOCALES } from "@/lib/locale";

test("an evening is hall, a book, the store, and a seat", () => {
  const steps = eveningSteps("");
  assert.deepEqual(
    steps.map((step) => step.id),
    ["hall", "book", "store", "seat"],
  );
  assert.equal(steps[0]?.href, "/");
  assert.equal(steps[1]?.href, "/wait");
  assert.equal(steps[2]?.href, "/wait/store");
  assert.equal(steps[3]?.href, "/network");
  assert.equal(eveningHere("/"), "hall");
  assert.equal(eveningHere("/wait"), "book");
  assert.equal(eveningHere("/wait/store"), "store");
  assert.equal(eveningHere("/network"), "seat");
  assert.equal(eveningHere("/rooms/classic"), "");
});

test("leaving a book comes back to that same book", () => {
  assert.equal(eveningBookId("catch-deep"), "catch-deep");
  assert.equal(eveningBookId("not-a-book"), "");
  assert.equal(eveningBookHref("catch-deep"), "/wait?sit=catch-deep");
  const back = eveningSteps("catch-deep");
  assert.equal(back[1]?.href, "/wait?sit=catch-deep");
  assert.equal(back[1]?.line, "Catch deep sit");
  assert.equal(eveningSteps("not-a-book")[1]?.href, "/wait");
});

test("Classic stays offered, and every language keeps its name", () => {
  for (const row of LOCALES) {
    const copy = eveningCopy(row.id);
    assert.match(copy.classic, /Classic/);
    const ids = eveningSteps("catch-deep", row.id).map((step) => step.href);
    assert.equal(ids.includes("/rooms/classic"), false);
    assert.equal(ids[1], "/wait?sit=catch-deep");
  }
});
