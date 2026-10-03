import type { Db, Pact, PactKind } from "@/lib/atrium/types";

export type Step = { db: Db } | { error: string };

/** Offered or accepted work returns the lock after this. A delivery pays the worker after this. */
export const LOCK_WINDOW_MS = 48 * 60 * 60 * 1000;

function clone(db: Db): Db {
  const next = structuredClone(db);
  next.pacts ??= [];
  return next;
}

function user(db: Db, id: string) {
  return db.users.find((row) => row.id === id) ?? null;
}

function line(db: Db, userId: string, cents: number, reason: string, at: number, id: string) {
  db.lines.push({ id, userId, cents, reason, at });
}

function stepAt(pact: Pact) {
  return pact.stepAt ?? pact.createdAt;
}

export function lockDue(pact: Pact) {
  return stepAt(pact) + LOCK_WINDOW_MS;
}

export function lockLine(pact: Pact, at = Date.now()) {
  if (pact.status === "returned") return "The lock returned. The terms did not change.";
  if (pact.status === "released" || pact.status === "declined") return "";
  const hours = Math.max(1, Math.ceil((lockDue(pact) - at) / (60 * 60 * 1000)));
  if (pact.status === "delivered") {
    return `If the locker does not release, the lock is paid to the worker in ${hours} hours.`;
  }
  return `If this is not delivered, the lock returns in ${hours} hours.`;
}

export type Heard = { userId: string; title: string; body: string; href: string };

/** The seat who has to answer. Money moves already notify the seat whose vault changed. */
export function pactHeard(pact: Pact, step: "offer" | "accept" | "deliver", amount: string): Heard {
  const href = `/contracts/${pact.id}`;
  if (step === "offer") {
    return {
      userId: pact.toId,
      title: "A contract is waiting",
      body: `${pact.title}. ${amount} USDT is locked. Accept it, or it returns in 48 hours.`,
      href,
    };
  }
  if (step === "accept") {
    return {
      userId: pact.fromId,
      title: "The terms were accepted",
      body: pact.title,
      href,
    };
  }
  return {
    userId: pact.fromId,
    title: "A delivery is waiting",
    body: `${pact.title}. Release the lock, or it is paid in 48 hours.`,
    href,
  };
}

/** Return a stale lock, or pay a delivery the locker left sitting. */
export function settlePacts(db: Db, at: number): Db {
  const next = clone(db);
  for (const pact of next.pacts) {
    if (at < lockDue(pact)) continue;
    if (pact.status === "offered" || pact.status === "accepted") {
      const payer = user(next, pact.fromId);
      if (!payer) continue;
      payer.balance += pact.priceCents;
      line(next, payer.id, pact.priceCents, "lock returned", at, `${pact.id}-return`);
      pact.status = "returned";
      pact.stepAt = at;
    } else if (pact.status === "delivered") {
      const worker = user(next, pact.toId);
      if (!worker) continue;
      worker.balance += pact.priceCents;
      line(next, worker.id, pact.priceCents, `released for ${pact.title}`, at, `${pact.id}-release`);
      pact.status = "released";
      pact.stepAt = at;
    }
  }
  return next;
}

/** Lock practice funds and freeze the words. Neither side can edit them after this. */
export function offerPact(
  db: Db,
  input: {
    actorId: string;
    toId: string;
    kind: PactKind;
    companyId: string;
    title: string;
    terms: string;
    priceCents: number;
    at: number;
    id: string;
  },
): Step {
  const next = clone(db);
  const title = input.title.trim().slice(0, 80);
  const terms = input.terms.trim().slice(0, 1000);
  if (!title || !terms) return { error: "Write a title and the terms." };
  if (input.actorId === input.toId) return { error: "A contract needs two seats." };
  if (!Number.isInteger(input.priceCents) || input.priceCents < 1) return { error: "Name a price in cents." };
  const payer = user(next, input.actorId);
  const worker = user(next, input.toId);
  if (!payer) return { error: "Open a practice balance first." };
  if (!worker) return { error: "That seat has not opened a practice balance." };
  if (payer.balance < input.priceCents) return { error: "Not enough practice balance to lock this contract." };
  payer.balance -= input.priceCents;
  line(next, payer.id, -input.priceCents, `locked for ${title}`, input.at, `${input.id}-lock`);
  next.pacts.push({
    id: input.id,
    kind: input.kind,
    companyId: input.companyId,
    fromId: payer.id,
    toId: worker.id,
    title,
    terms,
    priceCents: input.priceCents,
    status: "offered",
    proof: "",
    createdAt: input.at,
    stepAt: input.at,
  });
  return { db: next };
}

export function setPact(
  db: Db,
  input: {
    actorId: string;
    pactId: string;
    action: "accept" | "decline" | "deliver" | "release";
    proof?: string;
    at: number;
    id: string;
  },
): Step {
  const next = clone(db);
  const pact = next.pacts.find((row) => row.id === input.pactId);
  if (!pact) return { error: "That contract is gone." };
  const payer = user(next, pact.fromId);
  const worker = user(next, pact.toId);
  if (!payer || !worker) return { error: "That contract is broken." };

  if (input.action === "accept" || input.action === "decline" || input.action === "deliver") {
    if (input.actorId !== pact.toId) return { error: "Only the other seat can answer." };
  }
  if (input.action === "release" && input.actorId !== pact.fromId) {
    return { error: "Only the seat who locked the price can release it." };
  }

  if (input.action === "accept") {
    if (pact.status !== "offered") return { error: "That contract is already closed." };
    pact.status = "accepted";
    pact.stepAt = input.at;
    return { db: next };
  }
  if (input.action === "decline") {
    if (pact.status !== "offered" && pact.status !== "accepted") return { error: "That contract is already closed." };
    payer.balance += pact.priceCents;
    line(next, payer.id, pact.priceCents, "lock returned", input.at, input.id);
    pact.status = "declined";
    pact.stepAt = input.at;
    return { db: next };
  }
  if (input.action === "deliver") {
    if (pact.status !== "accepted") return { error: "Accept the contract before you deliver." };
    const proof = (input.proof ?? "").trim();
    if (!proof) return { error: "Leave the proof." };
    pact.proof = proof.slice(0, 1000);
    pact.status = "delivered";
    pact.stepAt = input.at;
    return { db: next };
  }
  if (pact.status !== "delivered") return { error: "Payment waits for a delivery." };
  worker.balance += pact.priceCents;
  line(next, worker.id, pact.priceCents, `released for ${pact.title}`, input.at, input.id);
  pact.status = "released";
  pact.stepAt = input.at;
  return { db: next };
}
