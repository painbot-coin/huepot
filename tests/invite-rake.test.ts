/**
 * Invite credit is a slice of house rake from a tagged seat's losing clicks.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { inviteCutCents, lastInviteCredit } from "@/lib/invite-rake";
import { seatTakesFromNotes, takePayoutNote } from "@/lib/take-copy";
import type { PublicTake } from "@/lib/types";

test("20% of that seat's rake, floored", () => {
  // 100 rake, they made 3 of 10 losing clicks → 30 player rake → 6 cut at 2000 bps
  assert.equal(inviteCutCents(10000, 3, 10, 2000, 0, 100000), 600);
});

test("the daily cap clips the cut", () => {
  assert.equal(inviteCutCents(10000, 10, 10, 2000, 900, 1000), 100);
  assert.equal(inviteCutCents(10000, 10, 10, 2000, 1000, 1000), 0);
});

test("no losing clicks, no cut", () => {
  assert.equal(inviteCutCents(10000, 0, 10, 2000, 0, 100000), 0);
  assert.equal(inviteCutCents(0, 4, 10, 2000, 0, 100000), 0);
});

test("the last invite line names who sat and which room", () => {
  const last = lastInviteCredit([
    {
      type: "invite",
      amount: 0.4,
      note: "Invite · 0.40 USDT from @ana · Classic #12",
      createdAt: 1,
    },
  ]);
  assert.equal(last?.from, "ana");
  assert.equal(last?.room, "Classic");
  assert.equal(last?.amount, 0.4);
});

test("a seat take matches the payout note the house already writes", () => {
  const take: PublicTake = {
    id: "r1",
    slug: "classic",
    roomName: "Classic",
    names: "Crimson",
    winners: ["crimson"],
    amount: 3.2,
    at: 200,
    number: 12,
  };
  const older: PublicTake = { ...take, id: "r0", at: 100, number: 11 };
  const note = takePayoutNote(take);
  assert.equal(note, "Classic round #12 Crimson take");
  const hits = seatTakesFromNotes([older, take], [note], 6);
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.id, "r1");
});
