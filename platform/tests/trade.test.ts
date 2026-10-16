import assert from "node:assert/strict";
import test from "node:test";
import { emptyDb, type Agent, type User } from "../lib/types";
import { offerTask, recordEarning, reviewTask, setTask, sharesFit } from "../lib/trade";
import { reputationOf } from "../lib/reputation";

function person(id: string, username: string): User {
  return {
    id,
    username,
    name: username,
    passwordHash: "x",
    kind: "human",
    claims: { human: true, over18: true, showName: true },
    balance: 2_000,
    apiKey: id,
    createdAt: 1,
  };
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
    queryCents: 2,
    taskCents: 500,
    reportCents: 5_000,
    monthCents: 20_000,
    published: true,
  };
}

test("a hire holds funds, then pays and writes the record", () => {
  const db = emptyDb();
  db.users.push(person("ada", "ada"), person("bea", "bea"));
  db.agents.push(bot("a1", "ada", "Ada AI"), bot("b1", "bea", "Bea AI"));
  const offered = offerTask(db, {
    actorId: "ada",
    fromAgentId: "a1",
    toAgentId: "b1",
    brief: "Find the permit.",
    priceCents: 500,
    at: 2,
    id: "t1",
  });
  assert.equal("error" in offered, false);
  if ("error" in offered) return;
  assert.equal(offered.db.users.find((row) => row.id === "ada")?.balance, 1_500);
  const accepted = setTask(offered.db, { actorId: "bea", taskId: "t1", action: "accept", at: 3, id: "a" });
  if ("error" in accepted) throw new Error(accepted.error);
  const delivered = setTask(accepted.db, { actorId: "bea", taskId: "t1", action: "deliver", proof: "Filed.", at: 4, id: "d" });
  if ("error" in delivered) throw new Error(delivered.error);
  const released = setTask(delivered.db, { actorId: "ada", taskId: "t1", action: "release", at: 5, id: "r" });
  if ("error" in released) throw new Error(released.error);
  assert.equal(released.db.users.find((row) => row.id === "bea")?.balance, 2_500);
  const reviewed = reviewTask(released.db, { actorId: "ada", taskId: "t1", stars: 5, body: "Clear.", at: 6, id: "v" });
  if ("error" in reviewed) throw new Error(reviewed.error);
  const rep = reputationOf({ userId: "bea", events: reviewed.db.events, reviews: reviewed.db.reviews });
  assert.equal(rep.provided, 1);
  assert.equal(rep.paidCents, 500);
  assert.equal(rep.reviewAvg, 5);
  assert.ok(rep.score > 0);
  const over = offerTask(reviewed.db, {
    actorId: "ada",
    fromAgentId: "a1",
    toAgentId: "b1",
    brief: "Again.",
    priceCents: 2_000,
    at: 7,
    id: "t2",
  });
  assert.equal("error" in over, true);
});

test("project shares must add to 100 and then split", () => {
  assert.equal(sharesFit([{ userId: "ada", bps: 6_000 }, { userId: "bea", bps: 4_000 }]), true);
  assert.equal(sharesFit([{ userId: "ada", bps: 6_000 }]), false);
  const db = emptyDb();
  db.users.push(person("ada", "ada"), person("bea", "bea"));
  db.projects.push({
    id: "p",
    title: "Permit guide",
    brief: "",
    ownerId: "ada",
    shares: [
      { userId: "ada", bps: 6_000 },
      { userId: "bea", bps: 4_000 },
    ],
    earningsCents: 0,
  });
  const paid = recordEarning(db, { actorId: "ada", projectId: "p", cents: 1_000, at: 8, id: "e" });
  if ("error" in paid) throw new Error(paid.error);
  assert.equal(paid.db.users.find((row) => row.id === "ada")?.balance, 1_600);
  assert.equal(paid.db.users.find((row) => row.id === "bea")?.balance, 2_400);
  assert.equal(paid.db.projects[0]?.earningsCents, 1_000);
});
