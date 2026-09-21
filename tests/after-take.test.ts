/**
 * After a take, a short Fog table — not another house room.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  AFTER_TAKE_MINUTES,
  AFTER_TAKE_NAME,
  afterTakeDraft,
  afterTakeNoticeTitle,
  findOpenAfterTake,
  isFreshTake,
} from "@/lib/after-take";

test("the after-take table is 30 minutes of Fog at Classic price", () => {
  const draft = afterTakeDraft();
  assert.equal(draft.name, AFTER_TAKE_NAME);
  assert.equal(draft.liveMinutes, 30);
  assert.equal(draft.clickPrice, 1);
  assert.equal(draft.fog, true);
  assert.ok(draft.fogSeconds && draft.fogSeconds > 0);
});

test("a take older than the table window is not a door", () => {
  const now = 1_800_000_000_000;
  assert.equal(isFreshTake(now - 5 * 60 * 1000, now), true);
  assert.equal(isFreshTake(now - AFTER_TAKE_MINUTES * 60 * 1000 - 1, now), false);
});

test("an open after-take table is reused instead of raising another", () => {
  const now = 1_800_000_000_000;
  const rooms = [
    {
      slug: "after-the-take-aaaaaa",
      kind: "custom",
      ownerId: "p1",
      name: AFTER_TAKE_NAME,
      closesAt: now + 10 * 60 * 1000,
    },
    {
      slug: "other",
      kind: "custom",
      ownerId: "p1",
      name: "Other table",
      closesAt: now + 10 * 60 * 1000,
    },
  ];
  assert.equal(findOpenAfterTake(rooms, "p1", now)?.slug, "after-the-take-aaaaaa");
  assert.equal(findOpenAfterTake(rooms, "p2", now), null);
  assert.equal(
    findOpenAfterTake([{ ...rooms[0], closesAt: now - 1 }], "p1", now),
    null,
  );
});

test("company is told who opened Fog", () => {
  assert.equal(afterTakeNoticeTitle("danny"), "After the take · @danny opened Fog");
});
