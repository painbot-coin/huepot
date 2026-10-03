import { readReady } from "@/lib/atrium/store";
import { formatCents } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { withStore, withStoreRead } from "@/lib/store";
import type { StoreData, User } from "@/lib/types";
import { applyHire, hireBook } from "@/lib/vault-hire-apply";
import { hireHeard, offerHire, payShares, setHire, settleHires } from "@/lib/vault-hire";

const OPEN = new Set(["offered", "accepted", "delivered"]);

export function settleHireStore(store: StoreData, at = Date.now()) {
  if (!(store.hires ?? []).some((row) => OPEN.has(row.status))) return;
  applyHire(store, settleHires(hireBook(store), at));
}

export function findSeat(store: StoreData, username: string) {
  const want = username.trim().toLowerCase();
  if (!want) return null;
  return Object.values(store.users).find((user) => user.username.toLowerCase() === want) ?? null;
}

function closed(user: User) {
  return Boolean(user.closedAt);
}

export async function readWork() {
  return withStore((store) => {
    settleHireStore(store);
    return {
      hires: structuredClone(store.hires ?? []),
      pays: structuredClone(store.pays ?? []),
    };
  });
}

export async function lockHire(input: {
  actorId: string;
  fromAgentId: string;
  toAgentId: string;
  brief: string;
  priceCents: number;
  id: string;
}) {
  const db = await readReady();
  const from = db.agents.find((row) => row.id === input.fromAgentId);
  const to = db.agents.find((row) => row.id === input.toAgentId);
  if (!from || !to) return "That agent is gone.";
  return withStore((store) => {
    settleHireStore(store);
    const buyer = store.users[input.actorId];
    const provider = store.users[to.ownerId];
    if (!buyer || closed(buyer)) return "A closed seat cannot hire.";
    if (!provider || closed(provider)) return "That seat is not on the vault.";
    const step = offerHire(hireBook(store, [buyer, provider]), { from, to }, {
      actorId: buyer.id,
      brief: input.brief,
      priceCents: input.priceCents,
      at: Date.now(),
      id: input.id,
    });
    if ("error" in step) return step.error;
    applyHire(store, step.book);
    const hire = step.book.hires.find((row) => row.id === input.id);
    if (hire) hear(store, hireHeard(hire, "offer", formatCents(hire.priceCents)));
    return "";
  });
}

export async function moveHire(input: {
  actorId: string;
  hireId: string;
  action: "accept" | "decline" | "deliver" | "release";
  proof: string;
  id: string;
}) {
  return withStore((store) => {
    settleHireStore(store);
    const actor = store.users[input.actorId];
    if (!actor) return "That seat is gone.";
    const step = setHire(hireBook(store, [actor]), {
      actorId: actor.id,
      hireId: input.hireId,
      action: input.action,
      proof: input.proof,
      at: Date.now(),
      id: input.id,
    });
    if ("error" in step) return step.error;
    applyHire(store, step.book);
    const hire = step.book.hires.find((row) => row.id === input.hireId);
    if (hire && (input.action === "accept" || input.action === "deliver")) {
      hear(store, hireHeard(hire, input.action, formatCents(hire.priceCents)));
    }
    return "";
  });
}

export async function splitEarning(input: {
  actorId: string;
  projectId: string;
  cents: number;
  id: string;
}) {
  const db = await readReady();
  const project = db.projects.find((row) => row.id === input.projectId);
  if (!project) return "That project is gone.";
  if (project.ownerId !== input.actorId) return "The owner records the earning.";
  return withStore((store) => {
    const owner = store.users[input.actorId];
    if (!owner || closed(owner)) return "A closed seat cannot pay a share.";
    const people = project.shares.map((share) => store.users[share.userId]).filter((row): row is User => Boolean(row));
    const step = payShares(hireBook(store, [owner, ...people]), {
      actorId: owner.id,
      projectId: project.id,
      shares: project.shares,
      cents: input.cents,
      at: Date.now(),
      id: input.id,
      title: project.title,
    });
    if ("error" in step) return step.error;
    applyHire(store, step.book);
    return "";
  });
}

export async function seatsByNames(names: string[]) {
  return withStoreRead((store) => names.map((name) => findSeat(store, name)));
}

function hear(store: StoreData, note: { userId: string; title: string; body: string; href: string }) {
  if (!store.users[note.userId]) return;
  notify(store, note.userId, { kind: "system", title: note.title, body: note.body, href: note.href });
}
