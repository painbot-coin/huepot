/**
 * The payout arithmetic.
 *
 * This is the part of the house where a mistake shows up as somebody being
 * paid the wrong amount, which is the one failure that cannot be apologised
 * away. Every number here was verified by hand against the rules in
 * GROWTH.md before being written down as an expectation.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  floorPayoutPerClick,
  formatCents,
  fromCents,
  rakeFromPot,
  splitCentsByClicks,
  toCents,
} from "@/lib/money";

test("cents convert both ways without drift", () => {
  assert.equal(toCents(1), 100);
  assert.equal(toCents(1.5), 150);
  assert.equal(toCents(0.01), 1);
  // 7.90 as a float is 7.900000000000001; rounding is what keeps it honest.
  assert.equal(toCents(7.9), 790);
  assert.equal(fromCents(790), 7.9);
  assert.equal(fromCents(1), 0.01);
  assert.equal(fromCents(0), 0);
});

test("a pot splits to the last cent, and never more than the pot", () => {
  // Three clicks against one, 100 cents to share: 75/25 exactly.
  const even = splitCentsByClicks(100, [
    { id: "a", clicks: 3 },
    { id: "b", clicks: 1 },
  ], 4);
  assert.equal(even.get("a"), 75);
  assert.equal(even.get("b"), 25);

  // 100 cents across 3 clicks does not divide. Base is 33 each with 1 left
  // over, and the leftover must land somewhere rather than vanish.
  const odd = splitCentsByClicks(100, [
    { id: "a", clicks: 1 },
    { id: "b", clicks: 1 },
    { id: "c", clicks: 1 },
  ], 3);
  const total = [...odd.values()].reduce((sum, n) => sum + n, 0);
  assert.equal(total, 100, "every cent of the pot is handed out");
  assert.deepEqual([...odd.values()].sort(), [33, 33, 34]);
});

test("leftover cents go in player-id order, so the same round pays the same twice", () => {
  const parts = [
    { id: "zebra", clicks: 1 },
    { id: "apple", clicks: 1 },
  ];
  const first = splitCentsByClicks(101, parts, 2);
  const again = splitCentsByClicks(101, [...parts].reverse(), 2);
  assert.equal(first.get("apple"), again.get("apple"));
  assert.equal(first.get("zebra"), again.get("zebra"));
  assert.equal(first.get("apple"), 51, "the earlier id takes the odd cent");
  assert.equal(first.get("zebra"), 50);
});

test("a player with more clicks cannot be given more leftover than they clicked", () => {
  // 10 cents over 9 clicks: base 1 each, 1 spare. The spare is capped by how
  // many clicks a player actually made, which is what stops one seat taking
  // the whole remainder.
  const shares = splitCentsByClicks(10, [
    { id: "a", clicks: 8 },
    { id: "b", clicks: 1 },
  ], 9);
  assert.equal([...shares.values()].reduce((s, n) => s + n, 0), 10);
  assert.ok((shares.get("b") ?? 0) <= 1 + 1, "one click cannot earn many spare cents");
});

test("an empty or impossible pot pays nothing rather than throwing", () => {
  const none = splitCentsByClicks(0, [{ id: "a", clicks: 2 }], 2);
  assert.equal(none.get("a"), 0);
  const noClicks = splitCentsByClicks(500, [{ id: "a", clicks: 0 }], 0);
  assert.equal(noClicks.get("a"), 0);
  const negative = splitCentsByClicks(-10, [{ id: "a", clicks: 1 }], 1);
  assert.equal(negative.get("a"), 0);
});

test("rake is a floor of the pot, and cannot exceed it", () => {
  assert.equal(rakeFromPot(1000, 500), 50, "5% of 10.00 is 0.50");
  assert.equal(rakeFromPot(999, 500), 49, "floored, never rounded up");
  assert.equal(rakeFromPot(1, 500), 0, "a pot too small to rake pays none");
  assert.equal(rakeFromPot(0, 500), 0);
  assert.equal(rakeFromPot(1000, 0), 0, "no rake configured means no rake");
  assert.equal(rakeFromPot(-100, 500), 0, "a negative pot cannot be raked");
});

test("the floor per winning click is a floor, and includes the stake back", () => {
  // A winner gets their own click price back plus a share of the losing pot.
  assert.equal(floorPayoutPerClick(100, 300, 3), 200, "100 back plus 100 share");
  assert.equal(floorPayoutPerClick(100, 100, 3), 133, "33 each, floored");
  assert.equal(
    floorPayoutPerClick(100, 0, 3),
    100,
    "nothing to win means the stake comes back",
  );
  assert.equal(
    floorPayoutPerClick(100, 500, 0),
    100,
    "no winning clicks falls back to the price rather than dividing by zero",
  );
});

test("money reads the way a player expects", () => {
  assert.equal(formatCents(790), "7.90");
  assert.equal(formatCents(0), "0.00");
  assert.equal(formatCents(1), "0.01");
  assert.equal(formatCents(123456), "1,234.56");
  assert.equal(formatCents(-500), "-5.00", "a debit reads as a debit");
});
