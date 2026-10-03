/**
 * Applications on house jobs. JSON under data/, same as seat projects.
 * Deploy leaves this file alone. An application is not money.
 */

import path from "path";
import { primeJsonFromAtlas } from "@/lib/atlas-json";
import { jsonWritesDone, readJsonFile, writeJsonFile } from "@/lib/durable-json";
import {
  BID_CAP,
  applicationNotice,
  applicationsOf,
  countOn,
  jobById,
  manageApplicationsOf,
  placeBidOn,
  publicBid,
  setBidStatusOn,
  takeBidFrom,
  yoursOn,
  type HouseBid,
} from "@/lib/house-jobs";
import { managerNotice, notifyManagers } from "@/lib/house-managers";
import { notify } from "@/lib/notifications";
import type { StoreData, User } from "@/lib/types";

const BIDS_PATH = path.join(process.cwd(), "data", "house-job-bids.json");

type BidLedger = { rows: HouseBid[] };

function emptyLedger(): BidLedger {
  return { rows: [] };
}

let memory = emptyLedger();
let loaded = false;
let chain = Promise.resolve();

function parseBids(raw: unknown): BidLedger {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Applications could not be read.");
  }
  const rows = (raw as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) throw new Error("Applications could not be read.");
  return { rows: rows.slice(0, BID_CAP) };
}

async function readLedger(): Promise<BidLedger> {
  if (loaded) return memory;
  await primeJsonFromAtlas();
  memory = readJsonFile(BIDS_PATH, parseBids, emptyLedger);
  loaded = true;
  return memory;
}

async function writeLedger(ledger: BidLedger) {
  memory = ledger;
  writeJsonFile(BIDS_PATH, ledger);
  await jsonWritesDone();
}

function withLedger<T>(fn: (ledger: BidLedger) => T | Promise<T>) {
  const run = chain.then(async () => fn(await readLedger()));
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function listBids() {
  return withLedger((ledger) => [...ledger.rows]);
}

export async function bidCount(jobId: string) {
  return withLedger((ledger) => countOn(ledger.rows, jobId));
}

export async function bidCounts() {
  return withLedger((ledger) => {
    const map: Record<string, number> = {};
    for (const row of ledger.rows) {
      map[row.jobId] = (map[row.jobId] ?? 0) + 1;
    }
    return map;
  });
}

export async function yourBids(userId: string) {
  return withLedger((ledger) => yoursOn(ledger.rows, userId));
}

export async function yourApplications(userId: string) {
  return withLedger((ledger) => applicationsOf(ledger.rows, userId));
}

export async function bidForUserJob(userId: string, jobId: string) {
  const yours = await yourBids(userId);
  return yours[jobId] ?? null;
}

export async function placeHouseBid(
  store: StoreData,
  user: User,
  jobId: string,
  note: unknown,
  href?: unknown,
) {
  const job = jobById(jobId);
  if (!job) throw new Error("That job was not found.");
  const had = await bidForUserJob(user.id, job.id);
  const { bid } = await withLedger(async (ledger) => {
    const next = placeBidOn(ledger.rows, {
      jobId,
      userId: user.id,
      username: user.username,
      seat: user.seat,
      note,
      href,
    });
    await writeLedger({ rows: next.rows });
    return next;
  });
  const notice = applicationNotice(had ? "update" : "new", job.title);
  notify(store, user.id, {
    kind: "system",
    title: notice.title,
    body: notice.body,
    href: `/jobs/${job.id}`,
  });
  notifyManagers(
    store,
    user.id,
    managerNotice(had ? "update" : "new", user.username, job.title, bid.id),
  );
  return bid;
}

export async function takeHouseBid(store: StoreData, user: User, jobId: string) {
  const job = jobById(jobId);
  const bid = await withLedger(async (ledger) => {
    const next = takeBidFrom(ledger.rows, user.id, jobId);
    await writeLedger({ rows: next.rows });
    return next.bid;
  });
  if (job) {
    notifyManagers(store, user.id, managerNotice("withdraw", user.username, job.title));
  }
  return bid;
}

export async function setHouseBidStatus(id: string, status: unknown) {
  return withLedger(async (ledger) => {
    const next = setBidStatusOn(ledger.rows, id, status);
    await writeLedger({ rows: next.rows });
    return next.bid;
  });
}

export async function listManageApplications() {
  return withLedger((ledger) => manageApplicationsOf(ledger.rows));
}

export async function listStaffBids() {
  const rows = await listBids();
  return rows.map((row) => {
    const job = jobById(row.jobId);
    return {
      ...publicBid(row),
      title: job?.title ?? row.jobId,
    };
  });
}
