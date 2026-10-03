import test from "node:test";
import assert from "node:assert/strict";
import { houseCardKind } from "@/lib/take-talk";
import { HOUSE_DAY_SLOTS, houseDayKey, houseDayPlan } from "@/lib/house-day";

const noon = Date.UTC(2026, 9, 2, 12, 0, 0);

test("three slots, and only the ones already due today", () => {
  assert.deepEqual([...HOUSE_DAY_SLOTS], [0, 8, 16]);
  const early = houseDayPlan(Date.UTC(2026, 9, 2, 0, 30, 0));
  const mid = houseDayPlan(noon);
  const late = houseDayPlan(Date.UTC(2026, 9, 2, 16, 5, 0));
  assert.equal(early.length, 1);
  assert.equal(mid.length, 2);
  assert.equal(late.length, 3);
  assert.deepEqual(
    late.map((row) => row.id),
    ["house-20261002-0", "house-20261002-8", "house-20261002-16"],
  );
  assert.equal(houseDayKey(noon), "20261002");
});

test("each day shifts the lines, and a door stays on this house", () => {
  const today = houseDayPlan(Date.UTC(2026, 9, 2, 20, 0, 0));
  const next = houseDayPlan(Date.UTC(2026, 9, 3, 20, 0, 0));
  assert.equal(today.length, 3);
  assert.notEqual(today[0]?.title, next[0]?.title);
  assert.equal(new Set(today.map((row) => row.title)).size, 3);
  for (const row of today) {
    assert.equal(houseCardKind(row.href), "house");
    assert.match(row.body, /./);
    assert.doesNotMatch(row.body, /everyone|players are|crowd/i);
    assert.ok(row.at <= Date.UTC(2026, 9, 2, 16, 0, 0));
  }
  assert.equal(next[0]?.id.startsWith("house-20261003-"), true);
});
