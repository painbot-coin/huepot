import { prisma } from "@/lib/db";
import type { StoreData } from "@/lib/types";

/**
 * One report shape for everything a player can report. It began as room chat
 * only; posts, comments and direct messages reuse it rather than getting their
 * own table, because the part that matters — grouping by who was reported, so
 * one irritated player is distinguishable from a pattern — is already here and
 * would otherwise have to exist twice.
 *
 * For chat, `target` is the room event and `roomSlug` says where. For the rest,
 * `target` is the row's id and `roomSlug` is empty.
 */
export type ReportKind = "chat" | "post" | "comment" | "message";

export type ChatReport = {
  id: string;
  kind: ReportKind;
  roomSlug: string;
  eventId: string;
  reporterId: string;
  username: string;
  body: string;
  createdAt: number;
  status: "open" | "hidden" | "dismissed";
};

function esc(value: string) {
  return value.replace(/'/g, "''");
}

export async function ensureReportTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ChatReport (
      id TEXT PRIMARY KEY,
      roomSlug TEXT NOT NULL,
      eventId TEXT NOT NULL,
      reporterId TEXT NOT NULL,
      username TEXT NOT NULL,
      body TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'open'
    )
  `);
  try {
    // Defaults to 'chat' so rows filed before this column stay what they were.
    await prisma.$executeRawUnsafe(
      "ALTER TABLE ChatReport ADD COLUMN kind TEXT NOT NULL DEFAULT 'chat'",
    );
  } catch {
    /* column already exists */
  }
}

export function reportChat(
  store: StoreData,
  slug: string,
  reporterId: string,
  eventId: string,
) {
  const room = store.rooms[slug];
  if (!room) throw new Error("That table was not found.");
  const event = room.events.find((item) => item.id === eventId && item.kind === "chat");
  if (!event) throw new Error("That message was not found.");
  if (event.userId === reporterId) throw new Error("You cannot report your own message.");
  return {
    id: crypto.randomUUID(),
    roomSlug: slug,
    eventId,
    reporterId,
    username: event.username ?? "player",
    body: event.body,
    createdAt: Date.now(),
    status: "open" as const,
  };
}

export function hideReportedChat(store: StoreData, slug: string, eventId: string) {
  const room = store.rooms[slug];
  if (!room) throw new Error("That table was not found.");
  const event = room.events.find((item) => item.id === eventId);
  if (!event) throw new Error("That message was not found.");
  event.body = "Removed.";
  if (event.userId && !(room.mutedIds ?? []).includes(event.userId)) {
    room.mutedIds = [...(room.mutedIds ?? []), event.userId];
  }
}

export async function insertReport(row: Omit<ChatReport, "kind"> & { kind?: ReportKind }) {
  await ensureReportTables();
  await prisma.$executeRawUnsafe(
    `INSERT INTO ChatReport (id, kind, roomSlug, eventId, reporterId, username, body, createdAt, status)
     VALUES ('${esc(row.id)}', '${esc(row.kind ?? "chat")}', '${esc(row.roomSlug)}', '${esc(row.eventId)}', '${esc(row.reporterId)}', '${esc(row.username)}', '${esc(row.body)}', ${row.createdAt}, 'open')`,
  );
}

/** A social report arrives with a target rather than a room event. */
export async function insertSocialReport(row: {
  id: string;
  kind: ReportKind;
  targetId: string;
  reporterId: string;
  username: string;
  body: string;
  createdAt: number;
}) {
  await insertReport({
    id: row.id,
    kind: row.kind,
    roomSlug: "",
    eventId: row.targetId,
    reporterId: row.reporterId,
    username: row.username,
    body: row.body,
    createdAt: row.createdAt,
    status: "open",
  });
}

export async function listReports() {
  await ensureReportTables();
  const rows = await prisma.$queryRawUnsafe<
    {
      id: string;
      roomSlug: string;
      eventId: string;
      reporterId: string;
      username: string;
      body: string;
      createdAt: string | number | bigint;
      status: string;
      kind: string | null;
    }[]
  >(
    "SELECT id, kind, roomSlug, eventId, reporterId, username, body, CAST(createdAt AS TEXT) as createdAt, status FROM ChatReport ORDER BY createdAt DESC LIMIT 80",
  );
  return rows.map(
    (row): ChatReport => ({
      id: row.id,
      kind: (row.kind ?? "chat") as ReportKind,
      roomSlug: row.roomSlug,
      eventId: row.eventId,
      reporterId: row.reporterId,
      username: row.username,
      body: row.body,
      createdAt: Number(row.createdAt),
      status: row.status as ChatReport["status"],
    }),
  );
}

export type ReportedPlayer = {
  username: string;
  open: number;
  total: number;
  hidden: number;
  reporters: number;
  lastAt: number;
};

/**
 * Reports grouped by who was reported, because one row at a time cannot tell
 * a single annoyed player from a pattern. Sorted by how many separate people
 * complained, which is the signal that survives one person clicking twice.
 */
export async function listReportedPlayers(): Promise<ReportedPlayer[]> {
  await ensureReportTables();
  const rows = await prisma.$queryRawUnsafe<
    {
      username: string;
      open: number | bigint;
      total: number | bigint;
      hidden: number | bigint;
      reporters: number | bigint;
      lastAt: string | number | bigint;
    }[]
  >(`
    SELECT username,
           SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open,
           COUNT(*) AS total,
           SUM(CASE WHEN status = 'hidden' THEN 1 ELSE 0 END) AS hidden,
           COUNT(DISTINCT reporterId) AS reporters,
           CAST(MAX(createdAt) AS TEXT) AS lastAt
      FROM ChatReport
     GROUP BY username
     ORDER BY reporters DESC, open DESC, lastAt DESC
     LIMIT 40
  `);
  return rows.map((row) => ({
    username: row.username,
    open: Number(row.open),
    total: Number(row.total),
    hidden: Number(row.hidden),
    reporters: Number(row.reporters),
    lastAt: Number(row.lastAt),
  }));
}

export async function setReportStatus(id: string, status: ChatReport["status"]) {
  await ensureReportTables();
  await prisma.$executeRawUnsafe(
    `UPDATE ChatReport SET status = '${esc(status)}' WHERE id = '${esc(id)}'`,
  );
}