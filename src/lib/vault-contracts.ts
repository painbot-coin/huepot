import { formatCents } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { withStore, withStoreRead } from "@/lib/store";
import type { StoreData, User } from "@/lib/types";
import { pactHeard } from "@/lib/atrium/pact";
import { applyPactBook, bookFromStore } from "@/lib/pact-apply";
import { offerVault, settleVault, setVault } from "@/lib/vault-pact";

const OPEN = new Set(["offered", "accepted", "delivered"]);

export function settleStore(store: StoreData, at = Date.now()) {
  if (!(store.pacts ?? []).some((row) => OPEN.has(row.status))) return;
  const next = settleVault(bookFromStore(store), at);
  applyPactBook(store, next);
}

export function startPactClock() {
  const g = globalThis as { __huepotPactClock?: boolean };
  if (g.__huepotPactClock) return;
  g.__huepotPactClock = true;
  const handle = setInterval(() => {
    void (async () => {
      const due = await withStoreRead(
        (store) =>
          (store.pacts ?? []).some((row) => OPEN.has(row.status)) ||
          (store.hires ?? []).some((row) => OPEN.has(row.status)),
      );
      if (!due) return;
      await withStore((store) => {
        settleStore(store);
        return import("@/lib/vault-work").then((mod) => mod.settleHireStore(store));
      });
    })().catch(() => undefined);
  }, 60_000);
  if (typeof handle === "object" && handle && "unref" in handle) {
    (handle as { unref: () => void }).unref();
  }
}

export function seatByName(store: StoreData, username: string) {
  const want = username.trim().toLowerCase();
  if (!want) return null;
  return Object.values(store.users).find((user) => user.username.toLowerCase() === want) ?? null;
}

function closed(user: User) {
  return Boolean(user.closedAt);
}

function hear(store: StoreData, note: { userId: string; title: string; body: string; href: string }) {
  if (!store.users[note.userId]) return;
  notify(store, note.userId, { kind: "system", title: note.title, body: note.body, href: note.href });
}

export async function readContracts() {
  return withStore((store) => {
    settleStore(store);
    const names: Record<string, string> = {};
    for (const user of Object.values(store.users)) names[user.id] = user.username;
    return { pacts: structuredClone(store.pacts ?? []), names };
  });
}

export async function lockVaultPact(input: {
  actorId: string;
  username: string;
  kind: "client" | "company";
  companyId: string;
  title: string;
  terms: string;
  priceCents: number;
  memberIds?: string[];
  id: string;
}) {
  return withStore((store) => {
    settleStore(store);
    const payer = store.users[input.actorId];
    const worker = seatByName(store, input.username);
    if (!payer || closed(payer)) return "A closed seat cannot lock a contract.";
    if (!worker) return "That username is not a seat.";
    if (closed(worker)) return "That seat is closed.";
    if (input.memberIds && !input.memberIds.includes(worker.id)) {
      return "That seat has not joined this company.";
    }
    const step = offerVault(bookFromStore(store, [payer, worker]), {
      actorId: payer.id,
      toId: worker.id,
      kind: input.kind,
      companyId: input.companyId,
      title: input.title,
      terms: input.terms,
      priceCents: input.priceCents,
      at: Date.now(),
      id: input.id,
    });
    if ("error" in step) return step.error;
    applyPactBook(store, step.book);
    const pact = step.book.pacts.find((row) => row.id === input.id);
    if (pact) hear(store, pactHeard(pact, "offer", formatCents(pact.priceCents)));
    return "";
  });
}

export async function moveVaultPact(input: {
  actorId: string;
  pactId: string;
  action: "accept" | "decline" | "deliver" | "release";
  proof: string;
  id: string;
}) {
  return withStore((store) => {
    settleStore(store);
    const actor = store.users[input.actorId];
    if (!actor) return "That seat is gone.";
    const step = setVault(bookFromStore(store, [actor]), {
      actorId: actor.id,
      pactId: input.pactId,
      action: input.action,
      proof: input.proof,
      at: Date.now(),
      id: input.id,
    });
    if ("error" in step) return step.error;
    applyPactBook(store, step.book);
    const pact = step.book.pacts.find((row) => row.id === input.pactId);
    if (pact && (input.action === "accept" || input.action === "deliver")) {
      hear(store, pactHeard(pact, input.action, formatCents(pact.priceCents)));
    }
    return "";
  });
}
