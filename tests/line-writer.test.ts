import assert from "node:assert/strict";
import test from "node:test";
import { bookLine, bookPostsAsSeat, lineWriterOf, writerLabel } from "@/lib/line-writer";
import { houseDayPlan } from "@/lib/house-day";

test("a line names a seat, the house, or a book", () => {
  assert.equal(lineWriterOf({ userId: "ada", username: "ada" }), "seat");
  assert.equal(writerLabel("seat", "ada"), "A seat · @ada");
  assert.equal(lineWriterOf({ userId: "house", username: "house" }), "house");
  assert.equal(lineWriterOf({ userId: "ada", username: "ada", link: "/wait" }), "house");
  assert.equal(writerLabel("house"), "The house");
  assert.equal(bookPostsAsSeat(), false);
  assert.equal(bookLine("Down"), "A book · Down");
  assert.equal(bookLine("Down").includes("@"), false);
  assert.equal(writerLabel("book", "Burst"), "A book · Burst");
  const day = houseDayPlan(Date.UTC(2026, 9, 2, 16, 5, 0));
  for (const row of day) {
    assert.equal(lineWriterOf({ userId: "house", link: row.href }), "house");
  }
});
