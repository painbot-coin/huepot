import { LOCK_WINDOW_MS, lockDue } from "@/lib/atrium/pact";
import type { Pact, PactKind } from "@/lib/atrium/types";

/** One USDT. Play credit cannot make up the difference. */
export const MIN_PACT_CENTS = 100;
/** Fat-finger cap. The vault balance is the other limit. */
export const MAX_PACT_CENTS = 10_000_000;

export type PactMove = {
  id: string;
  userId: string;
  cents: number;
  reason: string;
  at: number;
};

export type VaultBook = {
  balances: Record<string, number>;
  pacts: Pact[];
  moves: PactMove[];
};

export type VaultStep = { book: VaultBook } | { error: string };

const TWIN_MS = 60_000;

function clone(book: VaultBook): VaultBook {
  return {
    balances: { ...book.balances },
    pacts: structuredClone(book.pacts ?? []),
    moves: book.moves.map((row) => ({ ...row })),
  };
}

function has(book: VaultBook, id: string) {
  return Object.prototype.hasOwnProperty.call(book.balances, id) && Number.isFinite(book.balances[id]);
}

function pushMove(book: VaultBook, userId: string, cents: number, reason: string, at: number, id: string) {
  book.moves.push({ id, userId, cents, reason, at });
}

/** Return a stale lock, or pay a delivery the locker left sitting. USDT cents. */
export function settleVault(book: VaultBook, at: number): VaultBook {
  const next = clone(book);
  for (const pact of next.pacts) {
    if (at < lockDue(pact)) continue;
    if (pact.status === "offered" || pact.status === "accepted") {
      if (!has(next, pact.fromId)) continue;
      next.balances[pact.fromId] += pact.priceCents;
      pushMove(next, pact.fromId, pact.priceCents, "lock returned", at, `${pact.id}-return`);
      pact.status = "returned";
      pact.stepAt = at;
    } else if (pact.status === "delivered") {
      if (!has(next, pact.toId)) continue;
      next.balances[pact.toId] += pact.priceCents;
      pushMove(next, pact.toId, pact.priceCents, `released for ${pact.title}`, at, `${pact.id}-release`);
      pact.status = "released";
      pact.stepAt = at;
    }
  }
  return next;
}

/** Lock vault USDT and freeze the words. */
export function offerVault(
  book: VaultBook,
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
): VaultStep {
  const next = clone(book);
  const title = input.title.trim().slice(0, 80);
  const terms = input.terms.trim().slice(0, 1000);
  if (!title || !terms) return { error: "Write a title and the terms." };
  if (input.actorId === input.toId) return { error: "A contract needs two seats." };
  if (!Number.isInteger(input.priceCents) || input.priceCents < 1) return { error: "Name a price in USDT." };
  if (input.priceCents < MIN_PACT_CENTS) return { error: "Name a price of at least 1 USDT." };
  if (input.priceCents > MAX_PACT_CENTS) return { error: "A contract locks at most 100,000 USDT." };
  if (!has(next, input.actorId) || !has(next, input.toId)) return { error: "That seat is not on the vault." };
  if (next.balances[input.actorId] < input.priceCents) {
    return { error: "Not enough USDT in the vault. Play credit cannot lock a contract." };
  }
  const twin = next.pacts.find(
    (row) =>
      row.status === "offered" &&
      row.fromId === input.actorId &&
      row.toId === input.toId &&
      row.title === title &&
      row.terms === terms &&
      row.priceCents === input.priceCents &&
      input.at - (row.stepAt ?? row.createdAt) < TWIN_MS,
  );
  if (twin) return { error: "That contract is already locked." };
  next.balances[input.actorId] -= input.priceCents;
  pushMove(next, input.actorId, -input.priceCents, `locked for ${title}`, input.at, `${input.id}-lock`);
  next.pacts.push({
    id: input.id,
    kind: input.kind,
    companyId: input.companyId,
    fromId: input.actorId,
    toId: input.toId,
    title,
    terms,
    priceCents: input.priceCents,
    status: "offered",
    proof: "",
    createdAt: input.at,
    stepAt: input.at,
  });
  return { book: next };
}

export function setVault(
  book: VaultBook,
  input: {
    actorId: string;
    pactId: string;
    action: "accept" | "decline" | "deliver" | "release";
    proof?: string;
    at: number;
    id: string;
  },
): VaultStep {
  const next = clone(book);
  const pact = next.pacts.find((row) => row.id === input.pactId);
  if (!pact) return { error: "That contract is gone." };
  if (!has(next, pact.fromId) || !has(next, pact.toId)) return { error: "That contract is broken." };

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
    return { book: next };
  }
  if (input.action === "decline") {
    if (pact.status !== "offered" && pact.status !== "accepted") return { error: "That contract is already closed." };
    next.balances[pact.fromId] += pact.priceCents;
    pushMove(next, pact.fromId, pact.priceCents, "lock returned", input.at, input.id);
    pact.status = "declined";
    pact.stepAt = input.at;
    return { book: next };
  }
  if (input.action === "deliver") {
    if (pact.status !== "accepted") return { error: "Accept the contract before you deliver." };
    const proof = (input.proof ?? "").trim();
    if (!proof) return { error: "Leave the proof." };
    pact.proof = proof.slice(0, 1000);
    pact.status = "delivered";
    pact.stepAt = input.at;
    return { book: next };
  }
  if (pact.status !== "delivered") return { error: "Payment waits for a delivery." };
  next.balances[pact.toId] += pact.priceCents;
  pushMove(next, pact.toId, pact.priceCents, `released for ${pact.title}`, input.at, input.id);
  pact.status = "released";
  pact.stepAt = input.at;
  return { book: next };
}

export { LOCK_WINDOW_MS };
