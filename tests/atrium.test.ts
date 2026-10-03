import assert from "node:assert/strict";
import test from "node:test";
import { reputationOf } from "@/lib/atrium/reputation";
import { sharesFit } from "@/lib/atrium/trade";
import type { Agent } from "@/lib/atrium/types";
import { eventsOfHires, hireHeard, offerHire, payShares, setHire, type HireBook } from "@/lib/vault-hire";
import { cashImpliedCents } from "@/lib/sit-chips";

function book(): HireBook {
  return { balances: { ada: 2_000, bea: 2_000 }, hires: [], pays: [], moves: [] };
}

function bot(id: string, ownerId: string, name: string): Agent {
  return {
    id,
    ownerId,
    name,
    skills: ["research"],
    pitch: "Looks things up.",
    available: true,
    negotiateUnderCents: 1_000,
    spendLimitCents: 1_500,
    spentCents: 0,
    queryCents: 100,
    taskCents: 500,
    reportCents: 5_000,
    monthCents: 20_000,
    published: true,
  };
}

test("a hire locks vault USDT, then pays the provider", () => {
  const offered = offerHire(book(), { from: bot("a1", "ada", "Ada AI"), to: bot("b1", "bea", "Bea AI") }, {
    actorId: "ada",
    brief: "Find the permit.",
    priceCents: 500,
    at: 2,
    id: "t1",
  });
  if ("error" in offered) throw new Error(offered.error);
  assert.equal(offered.book.balances.ada, 1_500);
  assert.equal(offered.book.moves[0]?.cents, -500);
  const accepted = setHire(offered.book, { actorId: "bea", hireId: "t1", action: "accept", at: 3, id: "a" });
  if ("error" in accepted) throw new Error(accepted.error);
  const delivered = setHire(accepted.book, {
    actorId: "bea",
    hireId: "t1",
    action: "deliver",
    proof: "Filed.",
    at: 4,
    id: "d",
  });
  if ("error" in delivered) throw new Error(delivered.error);
  const released = setHire(delivered.book, { actorId: "ada", hireId: "t1", action: "release", at: 5, id: "r" });
  if ("error" in released) throw new Error(released.error);
  assert.equal(released.book.balances.bea, 2_500);
  const rep = reputationOf({
    userId: "bea",
    events: eventsOfHires(released.book.hires),
    reviews: [{ id: "v", taskId: "t1", fromUserId: "ada", aboutUserId: "bea", stars: 5, body: "Clear." }],
  });
  assert.equal(rep.provided, 1);
  assert.equal(rep.paidCents, 500);
  assert.equal(rep.reviewAvg, 5);
  const over = offerHire(released.book, { from: bot("a1", "ada", "Ada AI"), to: bot("b1", "bea", "Bea AI") }, {
    actorId: "ada",
    brief: "Again.",
    priceCents: 1_200,
    at: 7,
    id: "t2",
  });
  assert.equal("error" in over, true);
  assert.equal(
    cashImpliedCents([
      { type: "deposit", amount: 2_000 },
      { type: "hire", amount: -500 },
      { type: "hire", amount: 500 },
    ]),
    2_000,
  );
});

test("a short vault cannot hire, and a project split pays vault USDT", () => {
  const dust = offerHire(book(), { from: bot("a1", "ada", "Ada AI"), to: bot("b1", "bea", "Bea AI") }, {
    actorId: "ada",
    brief: "Too small.",
    priceCents: 50,
    at: 2,
    id: "t3",
  });
  assert.equal("error" in dust, true);
  assert.equal(sharesFit([{ userId: "ada", bps: 6_000 }, { userId: "bea", bps: 4_000 }]), true);
  assert.equal(sharesFit([{ userId: "ada", bps: 6_000 }]), false);
  const paid = payShares(book(), {
    actorId: "ada",
    projectId: "p",
    shares: [
      { userId: "ada", bps: 6_000 },
      { userId: "bea", bps: 4_000 },
    ],
    cents: 1_000,
    at: 8,
    id: "e",
    title: "Permit guide",
  });
  if ("error" in paid) throw new Error(paid.error);
  assert.equal(paid.book.balances.ada, 1_600);
  assert.equal(paid.book.balances.bea, 2_400);
  assert.equal(paid.book.pays[0]?.cents, 1_000);
});

test("the other seat hears a hire", () => {
  const offered = offerHire(book(), { from: bot("a", "ada", "Ada"), to: bot("b", "bea", "Bea") }, {
    actorId: "ada",
    brief: "Check the permit.",
    priceCents: 500,
    at: 2,
    id: "t9",
  });
  if ("error" in offered) throw new Error(offered.error);
  const hire = offered.book.hires[0];
  if (!hire) throw new Error("missing");
  const offer = hireHeard(hire, "offer", "5.00");
  assert.equal(offer.userId, "bea");
  assert.equal(offer.href, "/atrium/work/t9");
  const accepted = setHire(offered.book, { actorId: "bea", hireId: "t9", action: "accept", at: 3, id: "a" });
  if ("error" in accepted) throw new Error(accepted.error);
  const next = accepted.book.hires[0];
  if (!next) throw new Error("missing");
  assert.equal(hireHeard(next, "accept", "5.00").userId, "ada");
});
