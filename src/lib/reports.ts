import { prisma } from "@/lib/db";
import type { StoreData } from "@/lib/types";

export type ChatReport = {
  id: string;
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

export async function insertReport(row: ChatReport) {
  await ensureReportTables();
  await prisma.$executeRawUnsafe(
    `INSERT INTO ChatReport (id, roomSlug, eventId, reporterId, username, body, createdAt, status)
     VALUES ('${esc(row.id)}', '${esc(row.roomSlug)}', '${esc(row.eventId)}', '${esc(row.reporterId)}', '${esc(row.username)}', '${esc(row.body)}', ${row.createdAt}, 'open')`,
  );
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
    }[]
  >(
    "SELECT id, roomSlug, eventId, reporterId, username, body, CAST(createdAt AS TEXT) as createdAt, status FROM ChatReport ORDER BY createdAt DESC LIMIT 80",
  );
  return rows.map(
    (row): ChatReport => ({
      id: row.id,
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

export async function setReportStatus(id: string, status: ChatReport["status"]) {
  await ensureReportTables();
  await prisma.$executeRawUnsafe(
    `UPDATE ChatReport SET status = '${esc(status)}' WHERE id = '${esc(id)}'`,
  );
}