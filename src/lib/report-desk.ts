/**
 * How the desk reads a report. Pure — the money store and prisma stay off this file.
 */

export type ReportKind = "chat" | "post" | "comment" | "message";

export type DeskReportRow = {
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

export type ReportedPlayer = {
  username: string;
  open: number;
  total: number;
  hidden: number;
  reporters: number;
  lastAt: number;
};

/** The desk does not need who filed. The named seat is who was reported. */
export function deskReportOf(row: DeskReportRow) {
  return {
    id: row.id,
    kind: row.kind,
    roomSlug: row.roomSlug,
    eventId: row.eventId,
    username: row.username,
    body: row.body,
    createdAt: row.createdAt,
    status: row.status,
  };
}

export function countOpenReportsOf(rows: { status: string }[]) {
  return rows.filter((row) => row.status === "open").length;
}

export function reportWhere(row: { kind: ReportKind; roomSlug: string }) {
  if (row.kind === "chat") return row.roomSlug ? `/${row.roomSlug}` : "Table";
  if (row.kind === "post") return "Post";
  if (row.kind === "comment") return "Comment";
  return "Message";
}

/** The person who filed the report hears one of these two lines. */
export function reportReply(kept: boolean) {
  return kept
    ? {
        title: "Report kept",
        body: "The house kept your report and hid that writing.",
      }
    : {
        title: "Report dismissed",
        body: "The house dismissed your report. The writing stays.",
      };
}

export function hideReportLabel(kind: ReportKind) {
  return kind === "chat" ? "Hide + mute" : "Hide";
}

export function reportedPlayersOf(rows: DeskReportRow[]): ReportedPlayer[] {
  const map = new Map<
    string,
    { open: number; total: number; hidden: number; reporters: Set<string>; lastAt: number }
  >();
  for (const row of rows) {
    const key = row.username || "player";
    const cur = map.get(key) ?? {
      open: 0,
      total: 0,
      hidden: 0,
      reporters: new Set<string>(),
      lastAt: 0,
    };
    cur.total += 1;
    if (row.status === "open") cur.open += 1;
    if (row.status === "hidden") cur.hidden += 1;
    cur.reporters.add(row.reporterId);
    if (row.createdAt > cur.lastAt) cur.lastAt = row.createdAt;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([username, row]) => ({
      username,
      open: row.open,
      total: row.total,
      hidden: row.hidden,
      reporters: row.reporters.size,
      lastAt: row.lastAt,
    }))
    .sort((a, b) => b.reporters - a.reporters || b.open - a.open || b.lastAt - a.lastAt)
    .slice(0, 40);
}
