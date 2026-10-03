import assert from "node:assert/strict";
import test from "node:test";
import { pactHeard } from "@/lib/atrium/pact";
import { offerVault, setVault, settleVault, type VaultBook } from "@/lib/vault-pact";
import { cashImpliedCents } from "@/lib/sit-chips";

function book(): VaultBook {
  return { balances: { client: 2_000, dev: 0 }, pacts: [], moves: [] };
}

test("a contract locks vault USDT, then pays only after delivery", () => {
  const offered = offerVault(book(), {
    actorId: "client",
    toId: "dev",
    kind: "client",
    companyId: "",
    title: "Landing page",
    terms: "Ship the page. No revisions after accept.",
    priceCents: 500,
    at: 2,
    id: "c1",
  });
  if ("error" in offered) throw new Error(offered.error);
  assert.equal(offered.book.balances.client, 1_500);
  assert.equal(offered.book.moves[0]?.cents, -500);
  const tooSoon = setVault(offered.book, { actorId: "client", pactId: "c1", action: "release", at: 3, id: "x" });
  assert.equal("error" in tooSoon, true);
  const accepted = setVault(offered.book, { actorId: "dev", pactId: "c1", action: "accept", at: 4, id: "a" });
  if ("error" in accepted) throw new Error(accepted.error);
  const delivered = setVault(accepted.book, {
    actorId: "dev",
    pactId: "c1",
    action: "deliver",
    proof: "Page is up.",
    at: 5,
    id: "d",
  });
  if ("error" in delivered) throw new Error(delivered.error);
  const released = setVault(delivered.book, { actorId: "client", pactId: "c1", action: "release", at: 6, id: "r" });
  if ("error" in released) throw new Error(released.error);
  assert.equal(released.book.balances.dev, 500);
  assert.equal(released.book.pacts[0]?.status, "released");
  assert.equal(released.book.pacts[0]?.terms, "Ship the page. No revisions after accept.");
  assert.equal(
    cashImpliedCents([
      { type: "deposit", amount: 2_000 },
      { type: "contract", amount: -500 },
      { type: "contract", amount: 500 },
    ]),
    2_000,
  );
});

test("declining a contract returns the vault lock", () => {
  const offered = offerVault(
    { balances: { boss: 2_000, staff: 0 }, pacts: [], moves: [] },
    {
      actorId: "boss",
      toId: "staff",
      kind: "company",
      companyId: "co",
      title: "April",
      terms: "Four pages.",
      priceCents: 200,
      at: 2,
      id: "c2",
    },
  );
  if ("error" in offered) throw new Error(offered.error);
  const declined = setVault(offered.book, { actorId: "staff", pactId: "c2", action: "decline", at: 3, id: "n" });
  if ("error" in declined) throw new Error(declined.error);
  assert.equal(declined.book.balances.boss, 2_000);
  assert.equal(declined.book.pacts[0]?.status, "declined");
});

test("a short vault cannot lock, and a second click does not lock twice", () => {
  const short = offerVault(book(), {
    actorId: "client",
    toId: "dev",
    kind: "client",
    companyId: "",
    title: "Too much",
    terms: "More than the vault.",
    priceCents: 5_000,
    at: 2,
    id: "c5",
  });
  assert.equal("error" in short, true);
  const dust = offerVault(book(), {
    actorId: "client",
    toId: "dev",
    kind: "client",
    companyId: "",
    title: "Dust",
    terms: "Under a dollar.",
    priceCents: 50,
    at: 2,
    id: "c6",
  });
  assert.equal("error" in dust, true);
  const offered = offerVault(book(), {
    actorId: "client",
    toId: "dev",
    kind: "client",
    companyId: "",
    title: "Once",
    terms: "Do not double lock.",
    priceCents: 100,
    at: 10,
    id: "c7",
  });
  if ("error" in offered) throw new Error(offered.error);
  const again = offerVault(offered.book, {
    actorId: "client",
    toId: "dev",
    kind: "client",
    companyId: "",
    title: "Once",
    terms: "Do not double lock.",
    priceCents: 100,
    at: 11,
    id: "c8",
  });
  assert.equal("error" in again, true);
  assert.equal(offered.book.balances.client, 1_900);
});

test("a vault lock returns after 48 hours, and a sitting delivery is paid", () => {
  const offered = offerVault(book(), {
    actorId: "client",
    toId: "dev",
    kind: "client",
    companyId: "",
    title: "Landing page",
    terms: "Ship the page.",
    priceCents: 500,
    at: 1_000,
    id: "c3",
  });
  if ("error" in offered) throw new Error(offered.error);
  const early = settleVault(offered.book, 1_000 + 48 * 60 * 60 * 1000 - 1);
  assert.equal(early.pacts[0]?.status, "offered");
  const returned = settleVault(offered.book, 1_000 + 48 * 60 * 60 * 1000);
  assert.equal(returned.pacts[0]?.status, "returned");
  assert.equal(returned.balances.client, 2_000);

  const again = offerVault(returned, {
    actorId: "client",
    toId: "dev",
    kind: "client",
    companyId: "",
    title: "Landing page",
    terms: "Ship the page.",
    priceCents: 500,
    at: 2_000,
    id: "c4",
  });
  if ("error" in again) throw new Error(again.error);
  const accepted = setVault(again.book, { actorId: "dev", pactId: "c4", action: "accept", at: 3_000, id: "a" });
  if ("error" in accepted) throw new Error(accepted.error);
  const delivered = setVault(accepted.book, {
    actorId: "dev",
    pactId: "c4",
    action: "deliver",
    proof: "Up.",
    at: 4_000,
    id: "d",
  });
  if ("error" in delivered) throw new Error(delivered.error);
  const paid = settleVault(delivered.book, 4_000 + 48 * 60 * 60 * 1000);
  assert.equal(paid.pacts.find((row) => row.id === "c4")?.status, "released");
  assert.equal(paid.balances.dev, 500);
});

test("the other seat hears the offer, the acceptance, and the delivery", () => {
  const offered = offerVault(book(), {
    actorId: "client",
    toId: "dev",
    kind: "client",
    companyId: "",
    title: "Landing page",
    terms: "Ship the page.",
    priceCents: 500,
    at: 2,
    id: "c5",
  });
  if ("error" in offered) throw new Error(offered.error);
  const pact = offered.book.pacts[0];
  if (!pact) throw new Error("missing");
  const offer = pactHeard(pact, "offer", "5.00");
  assert.equal(offer.userId, "dev");
  assert.equal(offer.href, "/contracts/c5");
  assert.match(offer.body, /5\.00 USDT/);
  const accepted = setVault(offered.book, { actorId: "dev", pactId: "c5", action: "accept", at: 4, id: "a" });
  if ("error" in accepted) throw new Error(accepted.error);
  const next = accepted.book.pacts[0];
  if (!next) throw new Error("missing");
  assert.equal(pactHeard(next, "accept", "5.00").userId, "client");
  const delivered = setVault(accepted.book, {
    actorId: "dev",
    pactId: "c5",
    action: "deliver",
    proof: "Up.",
    at: 5,
    id: "d",
  });
  if ("error" in delivered) throw new Error(delivered.error);
  const done = delivered.book.pacts[0];
  if (!done) throw new Error("missing");
  const delivery = pactHeard(done, "deliver", "5.00");
  assert.equal(delivery.userId, "client");
  assert.match(delivery.body, /48 hours/);
});
