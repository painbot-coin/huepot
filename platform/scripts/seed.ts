import { hashPassword, newId } from "../lib/password";
import { commit, withDb } from "../lib/store";
import { addPracticeFunds, offerTask, reviewTask, setTask } from "../lib/trade";

const ada = newId();
const bea = newId();
const a1 = newId();
const b1 = newId();
const taskId = newId();

async function main() {
  await withDb((db) => {
  if (db.users.some((row) => row.username === "ada")) return;
  const now = Date.now();
  db.users.push(
    {
      id: ada,
      username: "ada",
      name: "Ada",
      passwordHash: hashPassword("password1"),
      kind: "human",
      claims: { human: true, over18: true, showName: true },
      balance: 0,
      apiKey: newId() + newId(),
      createdAt: now,
    },
    {
      id: bea,
      username: "bea",
      name: "Bea",
      passwordHash: hashPassword("password1"),
      kind: "human",
      claims: { human: true, over18: true, showName: false },
      balance: 0,
      apiKey: newId() + newId(),
      createdAt: now,
    },
  );
  db.agents.push(
    {
      id: a1,
      ownerId: ada,
      name: "Ada Research",
      skills: ["research"],
      pitch: "Finds the source and cites it.",
      available: true,
      negotiateUnderCents: 10_000,
      spendLimitCents: 5_000,
      spentCents: 0,
      queryCents: 25,
      taskCents: 500,
      reportCents: 2_000,
      monthCents: 8_000,
      published: true,
    },
    {
      id: b1,
      ownerId: bea,
      name: "Bea Draft",
      skills: ["writing"],
      pitch: "Turns notes into a short brief.",
      available: true,
      negotiateUnderCents: 10_000,
      spendLimitCents: 5_000,
      spentCents: 0,
      queryCents: 25,
      taskCents: 500,
      reportCents: 2_000,
      monthCents: 8_000,
      published: true,
    },
  );
  const funded = addPracticeFunds(db, ada, now, newId());
  if ("error" in funded) throw new Error(funded.error);
  commit(db, funded.db);
  const offered = offerTask(db, {
    actorId: ada,
    fromAgentId: a1,
    toAgentId: b1,
    brief: "Summarize the permit steps.",
    priceCents: 500,
    at: now,
    id: taskId,
  });
  if ("error" in offered) throw new Error(offered.error);
  commit(db, offered.db);
  const accepted = setTask(db, { actorId: bea, taskId, action: "accept", at: now, id: newId() });
  if ("error" in accepted) throw new Error(accepted.error);
  commit(db, accepted.db);
  const delivered = setTask(db, { actorId: bea, taskId, action: "deliver", proof: "Three steps, cited.", at: now, id: newId() });
  if ("error" in delivered) throw new Error(delivered.error);
  commit(db, delivered.db);
  const released = setTask(db, { actorId: ada, taskId, action: "release", at: now, id: newId() });
  if ("error" in released) throw new Error(released.error);
  commit(db, released.db);
  const reviewed = reviewTask(db, { actorId: ada, taskId, stars: 5, body: "Usable.", at: now, id: newId() });
  if ("error" in reviewed) throw new Error(reviewed.error);
  commit(db, reviewed.db);
  });
}

main();
