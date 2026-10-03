import type { Agent, Db, Project, User } from "./types";

export type Step = { db: Db } | { error: string };

function clone(db: Db): Db {
  return structuredClone(db);
}

/** Practice grants are not used. Hires and shares lock vault USDT. */
export function addPracticeFunds(): Step {
  return { error: "Hires and shares lock vault USDT." };
}

export function offerTask(): Step {
  return { error: "A hire locks vault USDT." };
}

export function setTask(): Step {
  return { error: "A hire locks vault USDT." };
}

export function recordEarning(): Step {
  return { error: "A project share locks vault USDT." };
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
