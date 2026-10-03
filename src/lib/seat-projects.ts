/**
 * Projects seats share. Gold is only to take a priced door home.
 * The pot stays on Classic.
 */

import path from "path";
import { primeJsonFromAtlas } from "@/lib/atlas-json";
import { jsonWritesDone, readJsonFile, writeJsonFile } from "@/lib/durable-json";
import { parseHouseSeat, seatOf, type HouseSeatId } from "@/lib/house-seats";
import { ensureHouseUser } from "@/lib/house";
import { seedHouseProjects } from "@/lib/house-projects";
import { priceLabel } from "@/lib/house-mark-list";
import { projectBuyNote } from "@/lib/mark-note";
import { notify } from "@/lib/notifications";
import {
  canOpenProject,
  parseProjectHref,
  publicProject,
  type PublicProject,
  type SeatProject,
} from "@/lib/seat-project-public";
import type { StoreData, User } from "@/lib/types";

export {
  canOpenProject,
  parseProjectHref,
  publicProject,
  type PublicProject,
  type SeatProject,
};
export { projectBuyNote, paidProjectInStore } from "@/lib/mark-note";

const PROJECTS_PATH = path.join(process.cwd(), "data", "seat-projects.json");
const NAME_MAX = 48;
const HOW_MAX = 180;
const SEAT_CAP = 8;

type ProjectLedger = {
  rows: SeatProject[];
  owned: Record<string, string[]>;
};

function emptyLedger(): ProjectLedger {
  return { rows: [], owned: {} };
}

let memory = emptyLedger();
let loaded = false;
let chain = Promise.resolve();

function cleanName(raw: unknown) {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2) throw new Error("Name the project.");
  return name.slice(0, NAME_MAX);
}

function cleanHow(raw: unknown) {
  const how = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (how.length < 4) throw new Error("Say how it sits.");
  return how.slice(0, HOW_MAX);
}

function parsePrice(raw: unknown) {
  const n = Math.max(0, Math.floor(Number(raw) || 0));
  if (n > 100_000) throw new Error("That price is too high.");
  return n;
}

function parseProjects(raw: unknown): ProjectLedger {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Projects could not be read.");
  }
  const row = raw as Partial<ProjectLedger>;
  if (row.rows != null && !Array.isArray(row.rows)) throw new Error("Projects could not be read.");
  if (row.owned != null && (typeof row.owned !== "object" || Array.isArray(row.owned))) {
    throw new Error("Projects could not be read.");
  }
  return { rows: row.rows ?? [], owned: row.owned ?? {} };
}

async function readLedger(): Promise<ProjectLedger> {
  if (loaded) return memory;
  await primeJsonFromAtlas();
  memory = readJsonFile(PROJECTS_PATH, parseProjects, emptyLedger);
  loaded = true;
  return memory;
}

async function writeLedger(ledger: ProjectLedger) {
  memory = ledger;
  writeJsonFile(PROJECTS_PATH, ledger);
  await jsonWritesDone();
}

function withLedger<T>(fn: (ledger: ProjectLedger) => T | Promise<T>) {
  const run = chain.then(async () => fn(await readLedger()));
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function withShelf<T>(store: StoreData, fn: (ledger: ProjectLedger) => T | Promise<T>) {
  ensureHouseUser(store);
  return withLedger(async (ledger) => {
    const next = seedHouseProjects(ledger.rows);
    if (next !== ledger.rows) {
      ledger.rows = next;
      await writeLedger(ledger);
    }
    return fn(ledger);
  });
}

export async function listProjects() {
  return withLedger(async (ledger) => {
    const next = seedHouseProjects(ledger.rows);
    if (next !== ledger.rows) {
      ledger.rows = next;
      await writeLedger(ledger);
    }
    return [...ledger.rows].sort((a, b) => b.createdAt - a.createdAt);
  });
}

export async function ownedProjects(userId: string) {
  return withLedger((ledger) => [...(ledger.owned[userId] ?? [])]);
}

export async function listPublicProjects(
  store: StoreData,
  viewerId?: string,
  seat?: HouseSeatId | "",
): Promise<PublicProject[]> {
  return withShelf(store, (ledger) => {
    const owned = viewerId ? [...(ledger.owned[viewerId] ?? [])] : [];
    return [...ledger.rows]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((row) => !seat || row.seat === seat)
      .flatMap((row) => {
        const user = store.users[row.userId];
        if (!user) return [];
        return [publicProject(row, user.username, owned)];
      });
  });
}

export async function listSeatProjects(store: StoreData, userId: string, viewerId?: string) {
  return withShelf(store, (ledger) => {
    const user = store.users[userId];
    if (!user) return [];
    const owned = viewerId ? [...(ledger.owned[viewerId] ?? [])] : [];
    return ledger.rows
      .filter((row) => row.userId === userId)
      .map((row) => publicProject(row, user.username, owned));
  });
}

export async function addProject(
  user: User,
  input: { name?: unknown; how?: unknown; href?: unknown; seat?: unknown; priceCents?: unknown },
) {
  const seat = parseHouseSeat(input.seat || user.seat);
  if (!seat) throw new Error("Pick a role first.");
  const row: SeatProject = {
    id: crypto.randomUUID(),
    userId: user.id,
    seat,
    name: cleanName(input.name),
    how: cleanHow(input.how),
    href: parseProjectHref(input.href),
    priceCents: parsePrice(input.priceCents),
    createdAt: Date.now(),
  };
  return withLedger(async (ledger) => {
    const mine = ledger.rows.filter((item) => item.userId === user.id);
    if (mine.length >= SEAT_CAP) throw new Error("Eight projects is enough on one seat.");
    ledger.rows.unshift(row);
    await writeLedger(ledger);
    return row;
  });
}

export async function dropProject(user: User, id: string) {
  const want = id.trim();
  return withLedger(async (ledger) => {
    const row = ledger.rows.find((item) => item.id === want);
    if (!row || row.userId !== user.id) throw new Error("That project is not yours.");
    ledger.rows = ledger.rows.filter((item) => item.id !== want);
    await writeLedger(ledger);
    return true;
  });
}

export async function paidProjectOnBooks(userId: string, projectId: string) {
  const { prisma } = await import("@/lib/db");
  const note = projectBuyNote(projectId);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM Tx WHERE playerId = ${userId} AND type = 'mark' AND note = ${note} LIMIT 1
  `;
  return rows.length > 0;
}

export async function grantProject(userId: string, projectId: string) {
  return withLedger(async (ledger) => {
    const have = new Set(ledger.owned[userId] ?? []);
    have.add(projectId);
    ledger.owned[userId] = [...have];
    await writeLedger(ledger);
    return ledger.owned[userId];
  });
}

export function buyProject(store: StoreData, user: User, row: SeatProject, owned: string[]) {
  if (row.priceCents <= 0 || owned.includes(row.id)) return owned;
  if (user.balance < row.priceCents) {
    const error = new Error("Not enough gold on the vault.");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  const now = Date.now();
  user.balance -= row.priceCents;
  store.txs.unshift({
    id: crypto.randomUUID(),
    playerId: user.id,
    type: "mark",
    amount: row.priceCents,
    createdAt: now,
    note: projectBuyNote(row.id),
  });
  const house = ensureHouseUser(store);
  house.balance += row.priceCents;
  store.txs.unshift({
    id: crypto.randomUUID(),
    playerId: house.id,
    type: "adjust",
    amount: row.priceCents,
    createdAt: now,
    note: projectBuyNote(row.id),
  });
  store.txs = store.txs.slice(0, 400);
  notify(store, user.id, {
    kind: "system",
    title: "A project left the vault",
    body: `${row.name} · ${priceLabel(row.priceCents)}. The door is yours.`,
    href: "/wait/store",
  });
  return [...owned, row.id];
}

export function seatOfProject(row: { seat?: string }) {
  return seatOf(row.seat);
}
