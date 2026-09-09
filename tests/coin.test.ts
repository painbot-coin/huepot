/**
 * The standing a player earns.
 *
 * HUE is deliberately derived from transaction rows rather than stored, so it
 * cannot drift from what a seat actually did. These tests pin the arithmetic
 * and the rank boundaries, which are the parts a player would notice being
 * wrong.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  HUE_PER_CLICK,
  HUE_PER_TAKE,
  HUE_RANKS,
  hueEarned,
  levelFor,
  nextRankFor,
  rankFor,
} from "@/lib/coin";

test("hue is clicks plus takes plus any task bonus", () => {
  assert.equal(hueEarned({ clicks: 0, takes: 0 }), 0);
  assert.equal(hueEarned({ clicks: 10, takes: 0 }), 10 * HUE_PER_CLICK);
  assert.equal(hueEarned({ clicks: 0, takes: 3 }), 3 * HUE_PER_TAKE);
  assert.equal(
    hueEarned({ clicks: 10, takes: 2, bonus: 5 }),
    10 * HUE_PER_CLICK + 2 * HUE_PER_TAKE + 5,
  );
});

test("a seat that never played has the first rank, not an error", () => {
  const rank = rankFor(0);
  assert.equal(rank.name, HUE_RANKS[0]!.name);
  assert.equal(levelFor(0).level, 1);
});

test("every rank boundary lands on the rank it names", () => {
  for (const step of HUE_RANKS) {
    assert.equal(
      rankFor(step.at).name,
      step.name,
      `exactly ${step.at} hue should be ${step.name}`,
    );
    if (step.at > 0) {
      assert.notEqual(
        rankFor(step.at - 1).name,
        step.name,
        `one short of ${step.at} should not yet be ${step.name}`,
      );
    }
  }
});

test("ranks only ever go up as hue goes up", () => {
  let seen = 0;
  for (let hue = 0; hue <= 2000; hue += 7) {
    const level = levelFor(hue).level;
    assert.ok(level >= seen, `level fell at ${hue} hue`);
    seen = level;
  }
});

test("the next rank is ahead of you, and runs out at the top", () => {
  assert.equal(nextRankFor(0)?.at, HUE_RANKS[1]!.at);
  const top = HUE_RANKS[HUE_RANKS.length - 1]!;
  assert.equal(nextRankFor(top.at), null, "the last rank has nothing after it");
  assert.equal(nextRankFor(top.at + 1000), null);
  const mid = HUE_RANKS[1]!;
  assert.ok((nextRankFor(mid.at)?.at ?? 0) > mid.at, "never points at where you already are");
});

test("levels are reported out of the number of ranks that exist", () => {
  assert.equal(levelFor(0).of, HUE_RANKS.length);
  assert.equal(levelFor(999_999).level, HUE_RANKS.length, "the top level is the last rank");
});
