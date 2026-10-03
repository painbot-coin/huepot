import type { Agent, ProjectPay, RepEvent, Task } from "@/lib/atrium/types";
import { LOCK_WINDOW_MS, MAX_PACT_CENTS, MIN_PACT_CENTS } from "@/lib/vault-pact";

export type HireMove = {
  id: string;
  userId: string;
  cents: number;
  reason: string;
  at: number;
};

export type HireBook = {
  balances: Record<string, number>;
  hires: Task[];
  pays: ProjectPay[];
  moves: HireMove[];
};

export type HireStep = { book: HireBook } | { error: string };

const TWIN_MS = 60_000;

function clone(book: HireBook): HireBook {
  return {
    balances: { ...book.balances },
    hires: structuredClone(book.hires ?? []),
    pays: structuredClone(book.pays ?? []),
    moves: book.moves.map((row) => ({ ...row })),
  };
}

function has(book: HireBook, id: string) {
  return Object.prototype.hasOwnProperty.call(book.balances, id) && Number.isFinite(book.balances[id]);
}

function pushMove(book: HireBook, userId: string, cents: number, reason: string, at: number, id: string) {
  book.moves.push({ id, userId, cents, reason, at });
}

function stepAt(hire: Task) {
  return hire.stepAt ?? hire.createdAt;
}

export function spentOn(book: HireBook, agentId: string) {
  return book.hires
    .filter((row) => row.fromAgentId === agentId && row.status !== "declined" && row.status !== "returned")
    .reduce((sum, row) => sum + row.priceCents, 0);
}

function priceOk(cents: number) {
  if (!Number.isInteger(cents) || cents < 1) return "Name a price in USDT.";
  if (cents < MIN_PACT_CENTS) return "Name a price of at least 1 USDT.";
  if (cents > MAX_PACT_CENTS) return "A hire locks at most 100,000 USDT.";
  return "";
}

/** Return a stale hold, or pay a delivery the buyer left sitting. Vault cents. */
export function settleHires(book: HireBook, at: number): HireBook {
  const next = clone(book);
  for (const hire of next.hires) {
    if (at < stepAt(hire) + LOCK_WINDOW_MS) continue;
    if (hire.status === "offered" || hire.status === "accepted") {
      if (!has(next, hire.buyerId)) continue;
      next.balances[hire.buyerId] += hire.priceCents;
      pushMove(next, hire.buyerId, hire.priceCents, "hold returned", at, `${hire.id}-return`);
      hire.status = "returned";
      hire.stepAt = at;
    } else if (hire.status === "delivered") {
      if (!has(next, hire.providerId)) continue;
      next.balances[hire.providerId] += hire.priceCents;
      pushMove(next, hire.providerId, hire.priceCents, `paid for ${hire.brief.slice(0, 80)}`, at, `${hire.id}-release`);
      hire.status = "released";
      hire.stepAt = at;
    }
  }
  return next;
}

export function offerHire(
  book: HireBook,
  agents: { from: Agent; to: Agent },
  input: { actorId: string; brief: string; priceCents: number; at: number; id: string },
): HireStep {
  const next = clone(book);
  const from = agents.from;
  const to = agents.to;
  const brief = input.brief.trim().slice(0, 500);
  if (!from || from.ownerId !== input.actorId) return { error: "That is not your agent." };
  if (!to || !to.published) return { error: "That agent is not on the market." };
  if (from.ownerId === to.ownerId) return { error: "Your own agents do not hire each other." };
  if (!brief) return { error: "Say what you need." };
  const priceError = priceOk(input.priceCents);
  if (priceError) return { error: priceError };
  if (to.negotiateUnderCents > 0 && input.priceCents > to.negotiateUnderCents) {
    return { error: "That is over the price this agent will take." };
  }
  if (spentOn(next, from.id) + input.priceCents > from.spendLimitCents) {
    return { error: "That is over this agent's spending limit." };
  }
  if (!has(next, input.actorId) || !has(next, to.ownerId)) return { error: "That seat is not on the vault." };
  if (next.balances[input.actorId] < input.priceCents) {
    return { error: "Not enough USDT in the vault. Play credit cannot hire." };
  }
  const twin = next.hires.find(
    (row) =>
      row.status === "offered" &&
      row.fromAgentId === from.id &&
      row.toAgentId === to.id &&
      row.brief === brief &&
      row.priceCents === input.priceCents &&
      input.at - stepAt(row) < TWIN_MS,
  );
  if (twin) return { error: "That hire is already held." };
  next.balances[input.actorId] -= input.priceCents;
  pushMove(next, input.actorId, -input.priceCents, `hold for ${to.name}`, input.at, `${input.id}-hold`);
  next.hires.push({
    id: input.id,
    fromAgentId: from.id,
    toAgentId: to.id,
    buyerId: input.actorId,
    providerId: to.ownerId,
    brief,
    priceCents: input.priceCents,
    status: "offered",
    proof: "",
    createdAt: input.at,
    stepAt: input.at,
  });
  return { book: next };
}

export function setHire(
  book: HireBook,
  input: {
    actorId: string;
    hireId: string;
    action: "accept" | "decline" | "deliver" | "release";
    proof?: string;
    at: number;
    id: string;
  },
): HireStep {
  const next = clone(book);
  const hire = next.hires.find((row) => row.id === input.hireId);
  if (!hire) return { error: "That work is gone." };
  if (!has(next, hire.buyerId) || !has(next, hire.providerId)) return { error: "That work is broken." };

  if (input.action === "accept" || input.action === "decline" || input.action === "deliver") {
    if (input.actorId !== hire.providerId) return { error: "Only the provider can answer." };
  }
  if (input.action === "release" && input.actorId !== hire.buyerId) {
    return { error: "Only the buyer can release payment." };
  }

  if (input.action === "accept") {
    if (hire.status !== "offered") return { error: "That offer is already closed." };
    hire.status = "accepted";
    hire.stepAt = input.at;
    return { book: next };
  }
  if (input.action === "decline") {
    if (hire.status !== "offered" && hire.status !== "accepted") return { error: "That offer is already closed." };
    next.balances[hire.buyerId] += hire.priceCents;
    pushMove(next, hire.buyerId, hire.priceCents, "hold returned", input.at, input.id);
    hire.status = "declined";
    hire.stepAt = input.at;
    return { book: next };
  }
  if (input.action === "deliver") {
    if (hire.status !== "accepted") return { error: "Accept the work before you deliver." };
    const proof = (input.proof ?? "").trim();
    if (!proof) return { error: "Leave the proof." };
    hire.proof = proof.slice(0, 1000);
    hire.status = "delivered";
    hire.stepAt = input.at;
    return { book: next };
  }
  if (hire.status !== "delivered") return { error: "Payment waits for a delivery." };
  next.balances[hire.providerId] += hire.priceCents;
  pushMove(next, hire.providerId, hire.priceCents, `paid for ${hire.brief.slice(0, 80)}`, input.at, input.id);
  hire.status = "released";
  hire.stepAt = input.at;
  return { book: next };
}

export function payShares(
  book: HireBook,
  input: {
    actorId: string;
    projectId: string;
    shares: { userId: string; bps: number }[];
    cents: number;
    at: number;
    id: string;
    title: string;
  },
): HireStep {
  const next = clone(book);
  const priceError = priceOk(input.cents);
  if (priceError) return { error: priceError };
  if (!input.shares.length) return { error: "Shares must add to 100%." };
  const seen = new Set<string>();
  let sum = 0;
  for (const share of input.shares) {
    if (!share.userId || seen.has(share.userId)) return { error: "Shares must add to 100%." };
    if (!Number.isInteger(share.bps) || share.bps < 1) return { error: "Shares must add to 100%." };
    if (!has(next, share.userId)) return { error: "A share names a seat that is not on the vault." };
    seen.add(share.userId);
    sum += share.bps;
  }
  if (sum !== 10_000) return { error: "Shares must add to 100%." };
  if (!has(next, input.actorId)) return { error: "That seat is not on the vault." };
  if (next.balances[input.actorId] < input.cents) {
    return { error: "Not enough USDT in the vault. Play credit cannot pay a share." };
  }
  const twin = next.pays.find(
    (row) =>
      row.projectId === input.projectId &&
      row.ownerId === input.actorId &&
      row.cents === input.cents &&
      input.at - row.at < TWIN_MS,
  );
  if (twin) return { error: "That earning was just split." };
  const title = input.title.trim().slice(0, 60) || "project";
  next.balances[input.actorId] -= input.cents;
  pushMove(next, input.actorId, -input.cents, `earning into ${title}`, input.at, `${input.id}-in`);
  let left = input.cents;
  input.shares.forEach((share, index) => {
    const cut = index === input.shares.length - 1 ? left : Math.floor((input.cents * share.bps) / 10_000);
    left -= cut;
    next.balances[share.userId] += cut;
    pushMove(next, share.userId, cut, `share of ${title}`, input.at, `${input.id}-${index}`);
  });
  next.pays.push({
    id: input.id,
    projectId: input.projectId,
    ownerId: input.actorId,
    cents: input.cents,
    at: input.at,
  });
  return { book: next };
}

export function eventsOfHires(hires: Task[]): RepEvent[] {
  const events: RepEvent[] = [];
  for (const hire of hires) {
    if (hire.status !== "released") continue;
    const at = hire.stepAt ?? hire.createdAt;
    events.push(
      { id: `${hire.id}-p`, userId: hire.providerId, kind: "provided", taskId: hire.id, cents: hire.priceCents, at },
      { id: `${hire.id}-h`, userId: hire.buyerId, kind: "hired", taskId: hire.id, cents: hire.priceCents, at },
    );
  }
  return events;
}

export function hireLine(hire: Task, at = Date.now()) {
  if (hire.status === "returned" || hire.status === "declined") return "The hold returned.";
  if (hire.status === "released") return "";
  const hours = Math.max(1, Math.ceil((stepAt(hire) + LOCK_WINDOW_MS - at) / (60 * 60 * 1000)));
  if (hire.status === "delivered") return `If the buyer does not release, the hold is paid in ${hours} hours.`;
  return `If this is not delivered, the hold returns in ${hours} hours.`;
}

export type Heard = { userId: string; title: string; body: string; href: string };

export function hireHeard(hire: Task, step: "offer" | "accept" | "deliver", amount: string): Heard {
  const href = `/atrium/work/${hire.id}`;
  if (step === "offer") {
    return {
      userId: hire.providerId,
      title: "A hire is waiting",
      body: `${hire.brief}. ${amount} USDT is held. Accept it, or it returns in 48 hours.`,
      href,
    };
  }
  if (step === "accept") {
    return {
      userId: hire.buyerId,
      title: "The hire was accepted",
      body: hire.brief,
      href,
    };
  }
  return {
    userId: hire.buyerId,
    title: "A delivery is waiting",
    body: `${hire.brief}. Release the hold, or it is paid in 48 hours.`,
    href,
  };
}
