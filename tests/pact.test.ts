import assert from "node:assert/strict";
import test from "node:test";
import { offerPact, setPact, settlePacts } from "@/lib/atrium/pact";
import { emptyDb, type User } from "@/lib/atrium/types";

function person(id: string, username: string, balance = 2_000): User {
  return {
    id,
    username,
    name: username,
    passwordHash: "",
    kind: "human",
    claims: { human: true, over18: true, showName: true },
    balance,
    apiKey: id,
    createdAt: 1,
  };
}

test("a contract locks practice funds, then pays only after delivery", () => {
  const db = emptyDb();
  db.users.push(person("client", "client"), person("dev", "dev", 0));
  const offered = offerPact(db, {
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
  assert.equal(offered.db.users.find((row) => row.id === "client")?.balance, 1_500);
  assert.equal(offered.db.pacts[0]?.terms, "Ship the page. No revisions after accept.");
  const tooSoon = setPact(offered.db, { actorId: "client", pactId: "c1", action: "release", at: 3, id: "x" });
  assert.equal("error" in tooSoon, true);
  const accepted = setPact(offered.db, { actorId: "dev", pactId: "c1", action: "accept", at: 4, id: "a" });
  if ("error" in accepted) throw new Error(accepted.error);
  const delivered = setPact(accepted.db, {
    actorId: "dev",
    pactId: "c1",
    action: "deliver",
    proof: "Page is up.",
    at: 5,
    id: "d",
  });
  if ("error" in delivered) throw new Error(delivered.error);
  const released = setPact(delivered.db, { actorId: "client", pactId: "c1", action: "release", at: 6, id: "r" });
  if ("error" in released) throw new Error(released.error);
  assert.equal(released.db.users.find((row) => row.id === "dev")?.balance, 500);
  assert.equal(released.db.pacts[0]?.status, "released");
  assert.equal(released.db.pacts[0]?.terms, "Ship the page. No revisions after accept.");
});

test("declining a contract returns the lock", () => {
  const db = emptyDb();
  db.users.push(person("boss", "boss"), person("staff", "staff", 0));
  const offered = offerPact(db, {
    actorId: "boss",
    toId: "staff",
    kind: "company",
    companyId: "co",
    title: "April",
    terms: "Four pages.",
    priceCents: 200,
    at: 2,
    id: "c2",
  });
  if ("error" in offered) throw new Error(offered.error);
  const declined = setPact(offered.db, { actorId: "staff", pactId: "c2", action: "decline", at: 3, id: "n" });
  if ("error" in declined) throw new Error(declined.error);
  assert.equal(declined.db.users.find((row) => row.id === "boss")?.balance, 2_000);
  assert.equal(declined.db.pacts[0]?.status, "declined");
});

test("a lock returns after 48 hours, and a sitting delivery is paid", () => {
  const db = emptyDb();
  db.users.push(person("client", "client"), person("dev", "dev", 0));
  const offered = offerPact(db, {
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
  const early = settlePacts(offered.db, 1_000 + 48 * 60 * 60 * 1000 - 1);
  assert.equal(early.pacts[0]?.status, "offered");
  const returned = settlePacts(offered.db, 1_000 + 48 * 60 * 60 * 1000);
  assert.equal(returned.pacts[0]?.status, "returned");
  assert.equal(returned.users.find((row) => row.id === "client")?.balance, 2_000);

  const again = offerPact(returned, {
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
  const accepted = setPact(again.db, { actorId: "dev", pactId: "c4", action: "accept", at: 3_000, id: "a" });
  if ("error" in accepted) throw new Error(accepted.error);
  const delivered = setPact(accepted.db, {
    actorId: "dev",
    pactId: "c4",
    action: "deliver",
    proof: "Up.",
    at: 4_000,
    id: "d",
  });
  if ("error" in delivered) throw new Error(delivered.error);
  const paid = settlePacts(delivered.db, 4_000 + 48 * 60 * 60 * 1000);
  assert.equal(paid.pacts.find((row) => row.id === "c4")?.status, "released");
  assert.equal(paid.users.find((row) => row.id === "dev")?.balance, 500);
});
