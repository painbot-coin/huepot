import type { Agent, Db, Project, User } from "./types";

export type Step = { db: Db } | { error: string };

function clone(db: Db): Db {
  return structuredClone(db);
}

function user(db: Db, id: string) {
  return db.users.find((row) => row.id === id) ?? null;
}

function agent(db: Db, id: string) {
  return db.agents.find((row) => row.id === id) ?? null;
}

function line(db: Db, userId: string, cents: number, reason: string, at: number, id: string) {
  db.lines.push({ id, userId, cents, reason, at });
}

export function addPracticeFunds(db: Db, userId: string, at: number, id: string): Step {
  const next = clone(db);
  const row = user(next, userId);
  if (!row) return { error: "Sign in first." };
  const already = next.lines.filter((item) => item.userId === userId && item.reason === "practice").reduce((sum, item) => sum + item.cents, 0);
  if (already >= 50_000) return { error: "Practice funds stop at $500." };
  const grant = Math.min(10_000, 50_000 - already);
  row.balance += grant;
  line(next, userId, grant, "practice", at, id);
  return { db: next };
}

export function offerTask(
  db: Db,
  input: { actorId: string; fromAgentId: string; toAgentId: string; brief: string; priceCents: number; at: number; id: string },
): Step {
  const next = clone(db);
  const from = agent(next, input.fromAgentId);
  const to = agent(next, input.toAgentId);
  const brief = input.brief.trim();
  if (!from || from.ownerId !== input.actorId) return { error: "That is not your agent." };
  if (!to || !to.published) return { error: "That agent is not on the market." };
  if (from.ownerId === to.ownerId) return { error: "Your own agents do not hire each other." };
  if (!brief) return { error: "Say what you need." };
  if (!Number.isInteger(input.priceCents) || input.priceCents < 1) return { error: "Name a price in cents." };
  if (to.negotiateUnderCents > 0 && input.priceCents > to.negotiateUnderCents) {
    return { error: "That is over the price this agent will take." };
  }
  if (from.spentCents + input.priceCents > from.spendLimitCents) return { error: "That is over this agent's spending limit." };
  const buyer = user(next, input.actorId);
  if (!buyer || buyer.balance < input.priceCents) return { error: "Not enough balance. Practice funds live on the wallet." };
  buyer.balance -= input.priceCents;
  from.spentCents += input.priceCents;
  line(next, buyer.id, -input.priceCents, `hold for ${to.name}`, input.at, `${input.id}-hold`);
  next.tasks.push({
    id: input.id,
    fromAgentId: from.id,
    toAgentId: to.id,
    buyerId: buyer.id,
    providerId: to.ownerId,
    brief,
    priceCents: input.priceCents,
    status: "offered",
    proof: "",
    createdAt: input.at,
  });
  return { db: next };
}

export function setTask(db: Db, input: { actorId: string; taskId: string; action: "accept" | "decline" | "deliver" | "release"; proof?: string; at: number; id: string }): Step {
  const next = clone(db);
  const task = next.tasks.find((row) => row.id === input.taskId);
  if (!task) return { error: "That work is gone." };
  const from = agent(next, task.fromAgentId);
  const buyer = user(next, task.buyerId);
  if (!from || !buyer) return { error: "That work is broken." };

  if (input.action === "accept" || input.action === "decline" || input.action === "deliver") {
    if (input.actorId !== task.providerId) return { error: "Only the provider can answer." };
  }
  if (input.action === "release" && input.actorId !== task.buyerId) return { error: "Only the buyer can release payment." };

  if (input.action === "accept") {
    if (task.status !== "offered") return { error: "That offer is already closed." };
    task.status = "accepted";
    return { db: next };
  }
  if (input.action === "decline") {
    if (task.status !== "offered" && task.status !== "accepted") return { error: "That offer is already closed." };
    buyer.balance += task.priceCents;
    from.spentCents = Math.max(0, from.spentCents - task.priceCents);
    line(next, buyer.id, task.priceCents, "hold returned", input.at, input.id);
    task.status = "declined";
    return { db: next };
  }
  if (input.action === "deliver") {
    if (task.status !== "accepted") return { error: "Accept the work before you deliver." };
    const proof = (input.proof ?? "").trim();
    if (!proof) return { error: "Leave the proof." };
    task.proof = proof;
    task.status = "delivered";
    return { db: next };
  }
  if (task.status !== "delivered") return { error: "Payment waits for a delivery." };
  const provider = user(next, task.providerId);
  if (!provider) return { error: "The provider is gone." };
  provider.balance += task.priceCents;
  line(next, provider.id, task.priceCents, `paid for ${task.brief.slice(0, 80)}`, input.at, input.id);
  task.status = "released";
  next.events.push(
    { id: `${input.id}-p`, userId: provider.id, kind: "provided", taskId: task.id, cents: task.priceCents, at: input.at },
    { id: `${input.id}-h`, userId: buyer.id, kind: "hired", taskId: task.id, cents: task.priceCents, at: input.at },
  );
  return { db: next };
}

export function reviewTask(db: Db, input: { actorId: string; taskId: string; stars: number; body: string; at: number; id: string }): Step {
  const next = clone(db);
  const task = next.tasks.find((row) => row.id === input.taskId);
  if (!task || task.status !== "released") return { error: "Review a finished payment." };
  if (input.actorId !== task.buyerId) return { error: "The buyer writes the review." };
  if (next.reviews.some((row) => row.taskId === task.id)) return { error: "This work already has a review." };
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) return { error: "Stars are 1 to 5." };
  next.reviews.push({
    id: input.id,
    taskId: task.id,
    fromUserId: input.actorId,
    aboutUserId: task.providerId,
    stars: input.stars,
    body: input.body.trim().slice(0, 500),
  });
  return { db: next };
}

export function sharesFit(shares: { userId: string; bps: number }[]) {
  if (!shares.length) return false;
  const seen = new Set<string>();
  let sum = 0;
  for (const share of shares) {
    if (!share.userId || seen.has(share.userId)) return false;
    if (!Number.isInteger(share.bps) || share.bps < 1) return false;
    seen.add(share.userId);
    sum += share.bps;
  }
  return sum === 10_000;
}

export function recordEarning(db: Db, input: { actorId: string; projectId: string; cents: number; at: number; id: string }): Step {
  const next = clone(db);
  const project = next.projects.find((row) => row.id === input.projectId);
  if (!project) return { error: "That project is gone." };
  if (project.ownerId !== input.actorId) return { error: "The owner records the earning." };
  if (!sharesFit(project.shares)) return { error: "Shares must add to 100%." };
  if (project.shares.some((share) => !user(next, share.userId))) return { error: "A share names someone who is not here." };
  if (!Number.isInteger(input.cents) || input.cents < 1) return { error: "Name the earning in cents." };
  const payer = user(next, input.actorId);
  if (!payer || payer.balance < input.cents) return { error: "Not enough balance to record that earning." };
  payer.balance -= input.cents;
  line(next, payer.id, -input.cents, `earning into ${project.title}`, input.at, `${input.id}-in`);
  let left = input.cents;
  project.shares.forEach((share, index) => {
    const cut = index === project.shares.length - 1 ? left : Math.floor((input.cents * share.bps) / 10_000);
    left -= cut;
    const person = user(next, share.userId);
    if (!person) return;
    person.balance += cut;
    line(next, person.id, cut, `share of ${project.title}`, input.at, `${input.id}-${index}`);
  });
  project.earningsCents += input.cents;
  return { db: next };
}

export function publicUser(row: User) {
  return {
    id: row.id,
    username: row.username,
    name: row.claims.showName ? row.name : "",
    kind: row.kind,
    claims: { human: row.claims.human, over18: row.claims.over18, showName: row.claims.showName },
    createdAt: row.createdAt,
  };
}

export function publicAgent(row: Agent) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    skills: row.skills,
    pitch: row.pitch,
    available: row.available,
    negotiateUnderCents: row.negotiateUnderCents,
    spendLimitCents: row.spendLimitCents,
    queryCents: row.queryCents,
    taskCents: row.taskCents,
    reportCents: row.reportCents,
    monthCents: row.monthCents,
    published: row.published,
  };
}

export function projectPublic(row: Project) {
  return { id: row.id, title: row.title, brief: row.brief, earningsCents: row.earningsCents, shares: row.shares };
}
