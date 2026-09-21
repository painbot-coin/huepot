/**
 * A take talks. An empty pot does not.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  houseCardKind,
  isTakePostHref,
  queueTakeTalk,
  shouldTalkAboutTake,
  takePostHref,
  takePostId,
  takeTalkFields,
  takeTalkPending,
  TAKE_POST_TITLE,
} from "@/lib/take-talk";

const take = {
  id: "round-42",
  names: "Crimson",
  amount: 3.95,
  roomName: "Classic Pit",
};

test("a real take writes one wing card to /take", () => {
  const fields = takeTalkFields(take);
  assert.equal(shouldTalkAboutTake(take), true);
  assert.equal(fields.id, "take-round-42");
  assert.equal(fields.link, "/take/round-42");
  assert.equal(fields.title, TAKE_POST_TITLE);
  assert.equal(fields.source, "Classic Pit");
  assert.equal(fields.body, "Crimson took 3.95 USDT on Classic Pit — sit the next round");
  assert.equal(takePostId("round-42"), "take-round-42");
  assert.equal(isTakePostHref(fields.link), true);
  assert.equal(houseCardKind(fields.link), "take");
});

test("empty and unpaid pots stay quiet", () => {
  assert.equal(shouldTalkAboutTake(null), false);
  assert.equal(shouldTalkAboutTake({ ...take, amount: 0 }), false);
  assert.equal(shouldTalkAboutTake({ ...take, names: "" }), false);
  assert.equal(shouldTalkAboutTake({ ...take, id: "  " }), false);
  assert.equal(takePostHref(""), "");
  assert.equal(houseCardKind(""), "");
  assert.equal(houseCardKind("https://nypost.com/odds"), "wire");
});

test("the same take queues once per settle, then drains", () => {
  queueTakeTalk(null);
  queueTakeTalk({ ...take, amount: 0 });
  queueTakeTalk(take);
  queueTakeTalk(take);
  const rows = takeTalkPending();
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.id, "round-42");
  assert.equal(takeTalkPending().length, 0);
});
