/**
 * Who is in a circle. Missing files start empty. An empty circle is not kept.
 */

import path from "path";
import { primeJsonFromAtlas } from "@/lib/atlas-json";
import { jsonWritesDone, readJsonFile, writeJsonFile } from "@/lib/durable-json";
import {
  circleOf,
  circlesOf,
  joinOn,
  leaveOn,
  listedCircles,
  seatsIn,
  type CircleRow,
} from "@/lib/circle-room";
import type { StoreData } from "@/lib/types";

const CIRCLES_PATH = path.join(process.cwd(), "data", "circles.json");

type Ledger = { rows: CircleRow[] };

let memory: Ledger = { rows: [] };
let loaded = false;
let chain = Promise.resolve();

async function readLedger(): Promise<Ledger> {
  if (loaded) return memory;
  await primeJsonFromAtlas();
  memory = readJsonFile(
    CIRCLES_PATH,
    (raw) => {
      const rows = (raw as Partial<Ledger> | null)?.rows;
      return { rows: Array.isArray(rows) ? rows : [] };
    },
    () => ({ rows: [] }),
  );
  loaded = true;
  return memory;
}

async function writeLedger(ledger: Ledger) {
  memory = ledger;
  writeJsonFile(CIRCLES_PATH, ledger);
  await jsonWritesDone();
}

function withLedger<T>(fn: (ledger: Ledger) => T | Promise<T>) {
  const run = chain.then(async () => fn(await readLedger()));
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function peopleOf(store: StoreData, members: string[]) {
  return seatsIn(members).flatMap((id) => {
    const user = store.users[id];
    if (!user || user.closedAt) return [];
    if (user.id === "house" || user.username.toLowerCase() === "house") return [];
    return [{ id: user.id, username: user.username }];
  });
}

export async function circlesForSeat(userId: string) {
  return withLedger((ledger) => circlesOf(ledger.rows, userId));
}

export async function listOpenCircles(store: StoreData) {
  return withLedger((ledger) =>
    listedCircles(ledger.rows)
      .map((row) => {
        const people = peopleOf(store, row.members);
        return {
          id: row.id,
          kind: row.kind,
          key: row.key,
          label: row.label,
          people,
        };
      })
      .filter((row) => row.people.length > 0),
  );
}

export async function circleRoom(store: StoreData, id: string) {
  const spec = circleOf(id);
  if (!spec) return null;
  return withLedger((ledger) => {
    const row = ledger.rows.find((item) => item.id === spec.id);
    const people = peopleOf(store, row?.members ?? []);
    return { ...spec, people };
  });
}

export async function joinCircle(userId: string, id: string) {
  return withLedger(async (ledger) => {
    const next = joinOn(ledger.rows, id, userId);
    ledger.rows = next.rows;
    await writeLedger(ledger);
    return next.circle;
  });
}

export async function leaveCircle(userId: string, id: string) {
  return withLedger(async (ledger) => {
    const next = leaveOn(ledger.rows, id, userId);
    ledger.rows = next.rows;
    await writeLedger(ledger);
    return next.circle;
  });
}
