import { prisma } from "@/lib/db";
import { sealRound, type PublicSettledRound } from "@/lib/fairness";
import type { ColorId } from "@/lib/colors";
import type { Room, Round, RoundResult } from "@/lib/types";

const pending: PublicSettledRound[] = [];

export function queueSettledRound(room: Room, round: Round, settledAt: number) {
  sealRound(round);
  if (!round.result || !round.serverSeed || !round.seedCommit || !round.fairHash) return;
  pending.push({
    id: round.id,
    roomSlug: room.slug,
    roomName: room.name,
    number: round.number,
    startedAt: round.startedAt,
    settledAt,
    clickPrice: round.clickPrice,
    buttonIds: [...round.buttonIds],
    totals: { ...round.result.totals },
    seedCommit: round.seedCommit,
    serverSeed: round.serverSeed,
    fairHash: round.fairHash,
    kind: round.result.kind,
    winners: [...round.result.winners],
    losingPot: round.result.losingPot,
    winningClicks: round.result.winningClicks,
    payoutPerWinningClick: round.result.payoutPerWinningClick,
    paidCount: round.result.payouts.length,
    unit: "cents",
    rake: round.result.rake ?? 0,
  });
}

export async function ensureFairTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS SettledRound (
      id TEXT PRIMARY KEY,
      roomSlug TEXT NOT NULL,
      roomName TEXT NOT NULL,
      number INTEGER NOT NULL,
      startedAt INTEGER NOT NULL,
      settledAt INTEGER NOT NULL,
      clickPrice REAL NOT NULL,
      buttonIds TEXT NOT NULL,
      totals TEXT NOT NULL,
      seedCommit TEXT NOT NULL,
      serverSeed TEXT NOT NULL,
      fairHash TEXT NOT NULL,
      kind TEXT NOT NULL,
      winners TEXT NOT NULL,
      losingPot REAL NOT NULL,
      winningClicks INTEGER NOT NULL,
      payoutPerWinningClick REAL NOT NULL,
      paidCount INTEGER NOT NULL,
      moneyCents INTEGER NOT NULL DEFAULT 0,
      rake INTEGER NOT NULL DEFAULT 0
    )
  `);
  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE Round ADD COLUMN fair TEXT NOT NULL DEFAULT '{}'",
    );
  } catch {
    /* column already exists */
  }
  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE SettledRound ADD COLUMN moneyCents INTEGER NOT NULL DEFAULT 0",
    );
  } catch {
    /* column already exists */
  }
  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE SettledRound ADD COLUMN rake INTEGER NOT NULL DEFAULT 0",
    );
  } catch {
    /* column already exists */
  }
}

export async function flushSettledRounds() {
  if (!pending.length) return;
  await ensureFairTables();
  while (pending.length) {
    const row = pending[0];
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO SettledRound (
        id, roomSlug, roomName, number, startedAt, settledAt, clickPrice, buttonIds, totals,
        seedCommit, serverSeed, fairHash, kind, winners, losingPot, winningClicks, payoutPerWinningClick, paidCount, moneyCents, rake
      ) VALUES (
        '${esc(row.id)}', '${esc(row.roomSlug)}', '${esc(row.roomName)}', ${row.number}, ${row.startedAt}, ${row.settledAt},
        ${row.clickPrice}, '${esc(JSON.stringify(row.buttonIds))}', '${esc(JSON.stringify(row.totals))}',
        '${esc(row.seedCommit)}', '${esc(row.serverSeed)}', '${esc(row.fairHash)}', '${esc(row.kind)}',
        '${esc(JSON.stringify(row.winners))}', ${row.losingPot}, ${row.winningClicks}, ${row.payoutPerWinningClick}, ${row.paidCount},
        ${row.unit === "cents" ? 1 : 0}, ${row.rake ?? 0}
      )`,
    );
    pending.shift();
  }
}

export function listPendingSettled() {
  return pending.slice();
}

const SETTLED_SELECT = `id, roomSlug, roomName, number,
  CAST(startedAt AS TEXT) AS startedAt, CAST(settledAt AS TEXT) AS settledAt,
  clickPrice, buttonIds, totals, seedCommit, serverSeed, fairHash, kind, winners,
  losingPot, winningClicks, payoutPerWinningClick, paidCount, moneyCents, rake`;

/**
 * Most rounds settle with nobody clicking, so a plain "most recent" window is
 * all empties and never contains a take. Pass a kind to look for takes.
 */
export async function listSettledRounds(slug?: string, take = 40, kind?: string) {
  await ensureFairTables();
  const limit = Math.max(1, Math.min(80, take));
  const where: string[] = [];
  if (slug) where.push(`roomSlug = '${esc(slug)}'`);
  if (kind) where.push(`kind = '${esc(kind)}'`);
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = await prisma.$queryRawUnsafe<RawSettled[]>(
    `SELECT ${SETTLED_SELECT} FROM SettledRound ${clause} ORDER BY settledAt DESC LIMIT ${limit}`,
  );
  return rows.map(fromRow);
}

export async function countSettledRounds(slug?: string) {
  await ensureFairTables();
  try {
    const rows = await prisma.$queryRawUnsafe<{ n: number | bigint }[]>(
      slug
        ? `SELECT COUNT(*) AS n FROM SettledRound WHERE roomSlug = '${esc(slug)}'`
        : "SELECT COUNT(*) AS n FROM SettledRound",
    );
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function getSettledRound(id: string) {
  await ensureFairTables();
  const rows = await prisma.$queryRawUnsafe<RawSettled[]>(
    `SELECT ${SETTLED_SELECT} FROM SettledRound WHERE id = '${esc(id)}' LIMIT 1`,
  );
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function loadRoundFair() {
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string; fair: string | null }[]>(
      "SELECT id, fair FROM Round",
    );
    return new Map(
      rows.map((row) => [row.id, parseFair(row.fair)]),
    );
  } catch {
    return new Map<string, { seedCommit: string; serverSeed: string; fairHash: string }>();
  }
}

function parseFair(raw: string | null) {
  try {
    const parsed = JSON.parse(raw || "{}") as {
      seedCommit?: string;
      serverSeed?: string;
      fairHash?: string;
    };
    return {
      seedCommit: parsed.seedCommit ?? "",
      serverSeed: parsed.serverSeed ?? "",
      fairHash: parsed.fairHash ?? "",
    };
  } catch {
    return { seedCommit: "", serverSeed: "", fairHash: "" };
  }
}

type RawSettled = {
  id: string;
  roomSlug: string;
  roomName: string;
  number: number;
  startedAt: number | string;
  settledAt: number | string;
  clickPrice: number;
  buttonIds: string;
  totals: string;
  seedCommit: string;
  serverSeed: string;
  fairHash: string;
  kind: string;
  winners: string;
  losingPot: number;
  winningClicks: number;
  payoutPerWinningClick: number;
  paidCount: number;
  moneyCents?: number;
  rake?: number;
};

function fromRow(row: RawSettled): PublicSettledRound {
  return {
    id: row.id,
    roomSlug: row.roomSlug,
    roomName: row.roomName,
    number: row.number,
    startedAt: Number(row.startedAt),
    settledAt: Number(row.settledAt),
    clickPrice: row.clickPrice,
    buttonIds: JSON.parse(row.buttonIds) as ColorId[],
    totals: JSON.parse(row.totals) as Record<ColorId, number>,
    seedCommit: row.seedCommit,
    serverSeed: row.serverSeed,
    fairHash: row.fairHash,
    kind: row.kind as RoundResult["kind"],
    winners: JSON.parse(row.winners) as ColorId[],
    losingPot: row.losingPot,
    winningClicks: row.winningClicks,
    payoutPerWinningClick: row.payoutPerWinningClick,
    paidCount: row.paidCount,
    unit: row.moneyCents ? "cents" : "usd",
    rake: row.rake ?? 0,
  };
}

function esc(value: string) {
  return value.replace(/'/g, "''");
}
