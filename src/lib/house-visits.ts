/**
 * Visitor tape for the manager desk. Guests and players both count.
 * Cookie id only — no IP is stored. The money store is not on this path.
 */

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  LIVE_MS,
  VISIT_DAY_KEEP,
  VISIT_KEEP_DAYS,
  daysBack,
  deskTraffic,
  emptyDay,
  liveCounts,
  doorDays,
  doorPeople,
  liveRoll,
  utcDay,
  whoRoll,
  visitDoor,
  visitKey,
  visitKind,
  type DeskTraffic,
  type LivePing,
  type VisitDayRow,
  type VisitKind,
} from "@/lib/house-traffic";

export const VISIT_COOKIE = "huepot_vid";
const COOKIE_MS = 60 * 60 * 24 * 30;

const live = new Map<string, LivePing>();
let ready = false;
let chain = Promise.resolve();

function withVisit<T>(fn: () => Promise<T>) {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function parseVisitId(raw: string) {
  const id = (raw ?? "").trim().toLowerCase();
  return /^[a-f0-9]{32}$/.test(id) ? id : "";
}

export function newVisitId() {
  return randomBytes(16).toString("hex");
}

export function visitCookieMaxAge() {
  return COOKIE_MS;
}

export async function ensureVisitTables() {
  if (ready) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS HouseVisitDay (
      day TEXT PRIMARY KEY,
      hits INTEGER NOT NULL DEFAULT 0,
      visitors INTEGER NOT NULL DEFAULT 0,
      guests INTEGER NOT NULL DEFAULT 0,
      players INTEGER NOT NULL DEFAULT 0
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS HouseVisitWho (
      day TEXT NOT NULL,
      vid TEXT NOT NULL,
      kind TEXT NOT NULL,
      PRIMARY KEY (day, vid)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS HouseVisitDoor (
      day TEXT NOT NULL,
      door TEXT NOT NULL,
      hits INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, door)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS HouseVisitDoorWho (
      day TEXT NOT NULL,
      door TEXT NOT NULL,
      userId TEXT NOT NULL,
      PRIMARY KEY (day, door, userId)
    )
  `);
  const cols = await prisma.$queryRawUnsafe<{ name: string }[]>("PRAGMA table_info(HouseVisitWho)");
  if (!cols.some((col) => col.name === "userId")) {
    await prisma.$executeRawUnsafe("ALTER TABLE HouseVisitWho ADD COLUMN userId TEXT NOT NULL DEFAULT ''");
  }
  ready = true;
}

function pruneLive(now: number) {
  if (live.size < 800) return;
  for (const [key, row] of live) {
    if (now - row.at >= LIVE_MS) live.delete(key);
  }
}

function touchLive(key: string, kind: VisitKind, now: number, userId = "") {
  const prev = live.get(key);
  live.set(key, { at: now, kind, userId: userId || prev?.userId || "" });
  pruneLive(now);
}

export function liveTraffic(now = Date.now()) {
  return liveCounts([...live.values()], now);
}

async function pruneOld(day: string) {
  const cut = daysBack(day, VISIT_KEEP_DAYS);
  const dayCut = daysBack(day, VISIT_DAY_KEEP);
  await prisma.$executeRaw`DELETE FROM HouseVisitWho WHERE day < ${cut}`;
  await prisma.$executeRaw`DELETE FROM HouseVisitDoorWho WHERE day < ${cut}`;
  await prisma.$executeRaw`DELETE FROM HouseVisitDoor WHERE day < ${cut}`;
  await prisma.$executeRaw`DELETE FROM HouseVisitDay WHERE day < ${dayCut}`;
}

export async function recordVisit(input: {
  vid: string;
  signedIn: boolean;
  userId?: string;
  path?: string;
  pulse?: boolean;
  at?: number;
}) {
  const at = input.at ?? Date.now();
  const day = utcDay(at);
  const kind = visitKind(input.signedIn);
  const userId = (input.userId ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  const key = visitKey("guest", input.vid);
  if (!key) return { day, key: "" };
  touchLive(key, kind, at, userId);
  if (input.pulse) return { day, key };

  const door = visitDoor(input.path ?? "/");
  await withVisit(async () => {
    await ensureVisitTables();
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO HouseVisitDay (day, hits, visitors, guests, players)
      VALUES (${day}, 0, 0, 0, 0)
    `;
    await prisma.$executeRaw`
      UPDATE HouseVisitDay SET hits = hits + 1 WHERE day = ${day}
    `;
    const was = await prisma.$queryRaw<{ kind: string; userId: string }[]>`
      SELECT kind, userId FROM HouseVisitWho WHERE day = ${day} AND vid = ${key} LIMIT 1
    `;
    if (!was[0]) {
      await prisma.$executeRaw`
        INSERT INTO HouseVisitWho (day, vid, kind, userId)
        VALUES (${day}, ${key}, ${kind}, ${userId})
      `;
      if (kind === "player") {
        await prisma.$executeRaw`
          UPDATE HouseVisitDay SET visitors = visitors + 1, players = players + 1
           WHERE day = ${day}
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE HouseVisitDay SET visitors = visitors + 1, guests = guests + 1
           WHERE day = ${day}
        `;
      }
    } else if (kind === "player" && was[0].kind === "guest") {
      await prisma.$executeRaw`
        UPDATE HouseVisitWho SET kind = 'player', userId = ${userId} WHERE day = ${day} AND vid = ${key}
      `;
      await prisma.$executeRaw`
        UPDATE HouseVisitDay
           SET guests = MAX(0, guests - 1), players = players + 1
         WHERE day = ${day}
      `;
    } else if (userId && was[0].userId !== userId) {
      await prisma.$executeRaw`
        UPDATE HouseVisitWho SET userId = ${userId} WHERE day = ${day} AND vid = ${key}
      `;
    }
    await prisma.$executeRaw`
      INSERT INTO HouseVisitDoor (day, door, hits)
      VALUES (${day}, ${door}, 1)
      ON CONFLICT(day, door) DO UPDATE SET hits = hits + 1
    `;
    if (userId) {
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO HouseVisitDoorWho (day, door, userId)
        VALUES (${day}, ${door}, ${userId})
      `;
    }
    if (Math.random() < 0.02) await pruneOld(day);
  });
  return { day, key };
}

export async function readDeskTraffic(extra: {
  accounts: number;
  applications: number;
  openApplications: number;
  openReports: number;
}): Promise<DeskTraffic> {
  await ensureVisitTables();
  const day = utcDay();
  const weekFrom = daysBack(day, 6);
  const todayRows = await prisma.$queryRaw<VisitDayRow[]>`
    SELECT day, hits, visitors, guests, players FROM HouseVisitDay WHERE day = ${day} LIMIT 1
  `;
  const days = await prisma.$queryRaw<VisitDayRow[]>`
    SELECT day, hits, visitors, guests, players FROM HouseVisitDay
     WHERE day >= ${weekFrom}
     ORDER BY day ASC
  `;
  const weekHits = days.reduce((sum, row) => sum + Number(row.hits), 0);
  const week = await prisma.$queryRaw<{ n: number | bigint }[]>`
    SELECT COUNT(DISTINCT vid) AS n FROM HouseVisitWho WHERE day >= ${weekFrom}
  `;
  const doors = await prisma.$queryRaw<{ door: string; hits: number }[]>`
    SELECT door, hits FROM HouseVisitDoor WHERE day = ${day} ORDER BY hits DESC
  `;
  return deskTraffic({
    now: liveTraffic(),
    today: todayRows[0]
      ? {
          day: todayRows[0].day,
          hits: Number(todayRows[0].hits),
          visitors: Number(todayRows[0].visitors),
          guests: Number(todayRows[0].guests),
          players: Number(todayRows[0].players),
        }
      : emptyDay(day),
    weekHits,
    weekVisitors: Number(week[0]?.n ?? 0),
    days: days.map((row) => ({
      day: row.day,
      hits: Number(row.hits),
      visitors: Number(row.visitors),
      guests: Number(row.guests),
      players: Number(row.players),
    })),
    doors: doors.map((row) => ({ door: row.door, hits: Number(row.hits) })),
    accounts: extra.accounts,
    applications: extra.applications,
    openApplications: extra.openApplications,
    openReports: extra.openReports,
    day,
  });
}

export async function readVisitRoll(now = Date.now()) {
  await ensureVisitTables();
  const day = utcDay(now);
  const weekFrom = daysBack(day, 6);
  const rows = await prisma.$queryRaw<{ day: string; kind: string; userId: string | null; vid: string }[]>`
    SELECT day, kind, userId, vid FROM HouseVisitWho WHERE day >= ${weekFrom}
  `;
  const named = whoRoll(
    rows.map((row) => ({
      day: row.day,
      kind: row.kind,
      userId: row.userId ?? "",
      vid: row.vid,
    })),
    day,
    weekFrom,
  );
  const doorHits = await prisma.$queryRaw<{ day: string; door: string; hits: number }[]>`
    SELECT day, door, hits FROM HouseVisitDoor WHERE day >= ${weekFrom}
  `;
  const doorRows = await prisma.$queryRaw<{ day: string; door: string; userId: string | null }[]>`
    SELECT day, door, userId FROM HouseVisitDoorWho WHERE day >= ${weekFrom}
  `;
  const byDay = doorDays(
    doorHits.map((row) => ({ day: row.day, door: row.door, hits: Number(row.hits) })),
    doorRows.map((row) => ({ day: row.day, door: row.door, userId: row.userId ?? "" })),
  );
  const current = liveRoll([...live.values()], now);
  return {
    liveUserIds: current.userIds,
    liveGuests: current.guests,
    liveUnnamed: current.unnamed,
    ...named,
    doors: doorPeople(
      byDay.filter((row) => row.day === day).flatMap((row) => row.userIds.map((userId) => ({ door: row.door, userId }))),
    ),
    doorDays: byDay,
  };
}
