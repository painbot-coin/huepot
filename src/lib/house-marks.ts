/**
 * Buy and keep a mark. The catalogue lives in house-mark-list.
 */

import path from "path";
import { primeJsonFromAtlas } from "@/lib/atlas-json";
import { jsonWritesDone, readJsonFile, writeJsonFile } from "@/lib/durable-json";
import { prisma } from "@/lib/db";
import { ensureHouseUser } from "@/lib/house";
import { type HouseMark, priceLabel } from "@/lib/house-mark-list";
import { markBuyNote, paidMarkInStore } from "@/lib/mark-note";
import { notify } from "@/lib/notifications";
import type { StoreData, User } from "@/lib/types";

export { markBuyNote, paidMarkInStore };

export async function paidMarkOnBooks(userId: string, markId: string) {
  const note = markBuyNote(markId);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM Tx WHERE playerId = ${userId} AND type = 'mark' AND note = ${note} LIMIT 1
  `;
  return rows.length > 0;
}

const MARKS_PATH = path.join(process.cwd(), "data", "house-marks.json");

type MarkLedger = {
  owned: Record<string, string[]>;
};

export function buyMark(store: StoreData, user: User, mark: HouseMark, owned: string[]) {
  if (mark.status !== "live") {
    const error = new Error("That mark is not on the table yet.");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  if (mark.priceCents <= 0 || owned.includes(mark.id)) return owned;
  if (user.balance < mark.priceCents) {
    const error = new Error("Not enough gold on the vault.");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  const now = Date.now();
  user.balance -= mark.priceCents;
  store.txs.unshift({
    id: crypto.randomUUID(),
    playerId: user.id,
    type: "mark",
    amount: mark.priceCents,
    createdAt: now,
    note: markBuyNote(mark.id),
  });
  const house = ensureHouseUser(store);
  house.balance += mark.priceCents;
  store.txs.unshift({
    id: crypto.randomUUID(),
    playerId: house.id,
    type: "adjust",
    amount: mark.priceCents,
    createdAt: now,
    note: markBuyNote(mark.id),
  });
  store.txs = store.txs.slice(0, 400);
  notify(store, user.id, {
    kind: "system",
    title: "A book left the vault",
    body: `${mark.name} · ${priceLabel(mark.priceCents)}. You can take the weights home.`,
    href: "/wait",
  });
  return [...owned, mark.id];
}

function emptyLedger(): MarkLedger {
  return { owned: {} };
}

let memory = emptyLedger();
let loaded = false;
let chain = Promise.resolve();

function parseMarks(raw: unknown): MarkLedger {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Marks could not be read.");
  }
  const owned = (raw as { owned?: unknown }).owned;
  if (owned != null && (typeof owned !== "object" || Array.isArray(owned))) {
    throw new Error("Marks could not be read.");
  }
  return { owned: (owned as MarkLedger["owned"]) ?? {} };
}

async function readLedger(): Promise<MarkLedger> {
  if (loaded) return memory;
  await primeJsonFromAtlas();
  memory = readJsonFile(MARKS_PATH, parseMarks, emptyLedger);
  loaded = true;
  return memory;
}

function withMarkLedger<T>(fn: (ledger: MarkLedger) => T | Promise<T>) {
  const run = chain.then(async () => {
    const ledger = await readLedger();
    return fn(ledger);
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function ownedMarks(userId: string) {
  return withMarkLedger((ledger) => [...(ledger.owned[userId] ?? [])]);
}

/** Books each seat sits. Missing ids own nothing. */
export async function booksBySeat() {
  return withMarkLedger((ledger) => {
    const copy: Record<string, string[]> = {};
    for (const [id, books] of Object.entries(ledger.owned)) {
      copy[id] = [...books];
    }
    return copy;
  });
}

export async function grantMark(userId: string, id: string) {
  return withMarkLedger(async (ledger) => {
    const have = new Set(ledger.owned[userId] ?? []);
    have.add(id);
    ledger.owned[userId] = [...have];
    writeJsonFile(MARKS_PATH, ledger);
    await jsonWritesDone();
    return ledger.owned[userId];
  });
}
