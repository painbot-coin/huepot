/**
 * The claim the house makes about itself.
 *
 * A player is told they can check a settled round without trusting anyone: the
 * seed was committed before the round, the digest covers the result, and the
 * published preimage lets them recompute it. These tests hold the house to
 * that, including the ways it could be quietly broken — a digest that ignores
 * part of the result, or a commit that does not match its seed.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emptyColorCounts } from "@/lib/colors";
import {
  fairDigest,
  fairPreimage,
  seedCommit,
  settledPreimage,
  settledTakeAmount,
  sha256Hex,
  verifySettledRound,
  type PublicSettledRound,
} from "@/lib/fairness";

/** A real-shaped take: crimson beat azure, 3 winning clicks at 100 cents. */
function takeRow(over: Partial<PublicSettledRound> = {}): PublicSettledRound {
  const serverSeed = "a".repeat(64);
  const row: PublicSettledRound = {
    id: "round-1",
    roomSlug: "classic",
    roomName: "Classic Pit",
    number: 42,
    startedAt: 1_700_000_000_000,
    settledAt: 1_700_000_060_000,
    clickPrice: 100,
    buttonIds: ["crimson", "azure", "volt", "amber"],
    // A board holds four colours but the totals record covers all eight, so
    // start from the empty set rather than hand-writing the zeroes.
    totals: { ...emptyColorCounts(), crimson: 3, azure: 2 },
    seedCommit: seedCommit(serverSeed),
    serverSeed,
    fairHash: "",
    kind: "take",
    winners: ["crimson"],
    losingPot: 200,
    winningClicks: 3,
    payoutPerWinningClick: 166,
    paidCount: 1,
    unit: "cents",
    rake: 10,
    ...over,
  };
  row.fairHash = fairDigest({
    serverSeed: row.serverSeed,
    roundId: row.id,
    number: row.number,
    buttonIds: row.buttonIds,
    totals: row.totals,
    kind: row.kind,
    winners: row.winners,
    losingPot: row.losingPot,
    payoutPerWinningClick: row.payoutPerWinningClick,
    rake: row.rake ?? 0,
  });
  return row;
}

test("the commit is the hash of the seed, so it can be checked after the reveal", () => {
  const seed = "b".repeat(64);
  assert.equal(seedCommit(seed), sha256Hex(seed));
  assert.notEqual(seedCommit(seed), seedCommit("c".repeat(64)));
});

test("a settled round verifies against its own published numbers", () => {
  const row = takeRow();
  const check = verifySettledRound(row);
  assert.equal(check.commitOk, true, "the revealed seed matches what was committed");
  assert.equal(check.hashOk, true, "the digest matches the result");
});

test("the published preimage is what actually gets hashed", () => {
  // This is the whole basis of the claim: a player reads the preimage off the
  // page, hashes it themselves, and gets the digest. If these ever diverge the
  // ledger is showing a number nobody can reproduce.
  const row = takeRow();
  assert.equal(sha256Hex(settledPreimage(row)), row.fairHash);
});

test("changing any part of the result breaks the digest", () => {
  const base = takeRow();
  const tamper: Array<[string, Partial<PublicSettledRound>]> = [
    ["the winner", { winners: ["azure"] }],
    ["a click count", { totals: { ...emptyColorCounts(), crimson: 4, azure: 2 } }],
    ["the losing pot", { losingPot: 400 }],
    ["the payout", { payoutPerWinningClick: 999 }],
    ["the round number", { number: 43 }],
    ["the rake", { rake: 50 }],
    ["the kind", { kind: "push" }],
  ];
  for (const [what, change] of tamper) {
    const edited = { ...base, ...change } as PublicSettledRound;
    const check = verifySettledRound(edited);
    assert.equal(check.hashOk, false, `editing ${what} must not still verify`);
  }
});

test("a seed that does not match its commit is caught", () => {
  const row = takeRow();
  const swapped = { ...row, serverSeed: "d".repeat(64) };
  const check = verifySettledRound(swapped);
  assert.equal(check.commitOk, false, "the reveal must match the promise");
});

test("the preimage covers every button, including ones nobody clicked", () => {
  // A digest that skipped empty colours could be replayed with a different
  // board, so the zeroes have to be in the string.
  const row = takeRow();
  const text = fairPreimage({
    serverSeed: row.serverSeed,
    roundId: row.id,
    number: row.number,
    buttonIds: row.buttonIds,
    totals: row.totals,
    kind: row.kind,
    winners: row.winners,
    losingPot: row.losingPot,
    payoutPerWinningClick: row.payoutPerWinningClick,
    rake: row.rake ?? 0,
  });
  assert.match(text, /volt:0/, "an unclicked colour is still committed to");
  assert.match(text, /amber:0/);
  assert.match(text, /crimson:3/);
});

test("winners are ordered in the preimage, so two winners hash the same either way", () => {
  const shared = {
    serverSeed: "e".repeat(64),
    roundId: "r",
    number: 1,
    buttonIds: ["crimson", "azure"],
    totals: { crimson: 2, azure: 2 },
    kind: "push",
    losingPot: 0,
    payoutPerWinningClick: 100,
    rake: 0,
  };
  const oneWay = fairDigest({ ...shared, winners: ["crimson", "azure"] });
  const other = fairDigest({ ...shared, winners: ["azure", "crimson"] });
  assert.equal(oneWay, other, "a tie must not hash differently by luck of ordering");
});

test("the take amount is what the winners actually collected", () => {
  // Stakes back plus the losing pot less rake: 3 x 100 + 200 - 10 = 490.
  const row = takeRow();
  assert.equal(settledTakeAmount(row), 4.9);
});

test("a round nobody won pays nothing", () => {
  const empty = takeRow({
    kind: "empty",
    winners: [],
    totals: emptyColorCounts(),
    losingPot: 0,
    winningClicks: 0,
    payoutPerWinningClick: 0,
    paidCount: 0,
    rake: 0,
  });
  assert.equal(settledTakeAmount(empty), 0);
});
