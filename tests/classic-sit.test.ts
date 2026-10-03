import test from "node:test";
import assert from "node:assert/strict";
import {
  FIRST_SIT_HREF,
  FIRST_SIT_LINE,
  afterSeatPath,
  classicWaitingFirstSit,
  firstSitCta,
  hallLiveDoor,
} from "@/lib/classic-sit";

test("a first seat with no dest lands on Classic", () => {
  assert.equal(afterSeatPath(""), FIRST_SIT_HREF);
  assert.equal(afterSeatPath("   "), FIRST_SIT_HREF);
  assert.equal(afterSeatPath("/wait"), "/wait");
  assert.equal(afterSeatPath("/jobs/ml"), "/jobs/ml");
});

test("empty Classic is waiting for the first player", () => {
  assert.equal(classicWaitingFirstSit({ slug: "classic", pot: 0, players: 0 }), true);
  assert.equal(classicWaitingFirstSit({ slug: "classic", pot: 100, players: 0 }), false);
  assert.equal(classicWaitingFirstSit({ slug: "classic", pot: 0, players: 1 }), false);
  assert.equal(classicWaitingFirstSit({ slug: "lightning", pot: 0, players: 0 }), false);
  assert.match(FIRST_SIT_LINE, /first to play/);
});

test("the public pit stays on the Live shelf when empty", () => {
  assert.equal(hallLiveDoor({ slug: "classic", players: 0 }), true);
  assert.equal(hallLiveDoor({ slug: "lightning", players: 0 }), false);
  assert.equal(hallLiveDoor({ slug: "lightning", players: 1 }), true);
  assert.equal(hallLiveDoor({ slug: "night", players: 0 }), false);
  assert.equal(hallLiveDoor({ slug: "night", players: 0 }, { nightLive: true }), true);
  assert.equal(hallLiveDoor({ slug: "fog", players: 0 }, { cupLive: true }), true);
});

test("first-sit copy stays off a deposit bonus", () => {
  assert.equal(firstSitCta(false, false), "Sign in to play");
  assert.equal(firstSitCta(true, true), "Play credit · Classic");
  assert.equal(firstSitCta(true, false), "Play Classic");
  assert.doesNotMatch(
    [FIRST_SIT_LINE, firstSitCta(false, false), firstSitCta(true, true)].join(" "),
    /deposit bonus/i,
  );
});
