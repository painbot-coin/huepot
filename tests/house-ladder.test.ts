import assert from "node:assert/strict";
import test from "node:test";
import { houseLadder } from "@/lib/house-ladder";

test("seven doors, and none of them is a wallet or a score", () => {
  const steps = houseLadder({
    bookId: "wait-down",
    fileHref: "/wait?sit=wait-down",
    profileHref: "/network/u/bill",
  });
  assert.deepEqual(
    steps.map((row) => row.id),
    ["seat", "book", "store", "pair", "file", "record", "project"],
  );
  assert.equal(steps[1]?.href, "/wait?sit=wait-down");
  assert.equal(steps[2]?.href, "/wait/store");
  assert.equal(steps[3]?.href, "/wait?pair=wait-down");
  assert.equal(steps[4]?.href, "/wait?sit=wait-down");
  assert.equal(steps[5]?.href, "/network/u/bill#history");
  assert.equal(steps[6]?.href, "/jobs");
  const plain = houseLadder();
  assert.equal(plain[1]?.href, "/wait");
  assert.equal(plain[3]?.href, "/wait");
  assert.equal(plain[4]?.href, "/wait/store");
  assert.equal(plain[5]?.href, "/network#history");
  const text = JSON.stringify(steps);
  assert.equal(text.includes("reputation"), false);
  assert.match(text, /Neither holds a wallet/);
  assert.match(text, /no second number/);
  assert.match(text, /not a wage/);
  assert.match(text, /not a split/);
});
