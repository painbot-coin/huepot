/**
 * How the desk counts a visitor. Guests and signed-in seats both count.
 * A day is UTC. Live is whoever pinged in the last five minutes.
 */

export const LIVE_MS = 5 * 60 * 1000;
export const VISIT_KEEP_DAYS = 14;
export const VISIT_DAY_KEEP = 90;

export type VisitKind = "guest" | "player";
export type VisitDoor =
  | "home"
  | "news"
  | "jobs"
  | "games"
  | "network"
  | "table"
  | "gate"
  | "other";

export type VisitDayRow = {
  day: string;
  hits: number;
  visitors: number;
  guests: number;
  players: number;
};

export type LivePing = { at: number; kind: VisitKind; userId?: string };

export type WhoRow = { day: string; kind: string; userId: string; vid: string };

export type VisitSlice = {
  userIds: string[];
  guests: number;
  unnamed: number;
};

export type VisitRoll = {
  liveUserIds: string[];
  liveGuests: number;
  liveUnnamed: number;
  todayUserIds: string[];
  todayGuests: number;
  todayUnnamed: number;
  weekUserIds: string[];
  weekGuests: number;
  days: { day: string; userIds: string[]; guests: number; unnamed: number }[];
  doors: { door: VisitDoor; userIds: string[] }[];
  doorDays: { day: string; door: VisitDoor; hits: number; userIds: string[] }[];
};

export function doorPeople(rows: { door: string; userId: string }[]) {
  const map = new Map<VisitDoor, string[]>();
  for (const row of rows) {
    const id = (row.userId ?? "").trim();
    if (!id) continue;
    const door = parseVisitDoor(row.door);
    const list = map.get(door) ?? [];
    if (!list.includes(id)) list.push(id);
    map.set(door, list);
  }
  return [...map.entries()].map(([door, userIds]) => ({ door, userIds }));
}

export function doorDays(
  hits: { day: string; door: string; hits: number }[],
  people: { day: string; door: string; userId: string }[],
) {
  const map = new Map<string, { day: string; door: VisitDoor; hits: number; userIds: string[] }>();
  for (const row of hits) {
    const door = parseVisitDoor(row.door);
    const key = `${row.day}\u001f${door}`;
    const hit = Math.max(0, Math.floor(Number(row.hits) || 0));
    const prev = map.get(key);
    if (prev) prev.hits += hit;
    else map.set(key, { day: row.day, door, hits: hit, userIds: [] });
  }
  for (const row of people) {
    const id = (row.userId ?? "").trim();
    if (!id) continue;
    const door = parseVisitDoor(row.door);
    const key = `${row.day}\u001f${door}`;
    const prev = map.get(key) ?? { day: row.day, door, hits: 0, userIds: [] };
    if (!prev.userIds.includes(id)) prev.userIds.push(id);
    map.set(key, prev);
  }
  return [...map.values()];
}

const DOOR_ORDER: VisitDoor[] = ["home", "news", "jobs", "games", "network", "table", "gate", "other"];

export function lastSeen(
  days: { day: string; userIds: string[] }[],
  doors: { day: string; door: VisitDoor; userIds: string[] }[],
) {
  const found = new Map<string, { day: string; doors: VisitDoor[] }>();
  function keep(id: string, day: string) {
    const prev = found.get(id);
    if (!prev || day > prev.day) {
      const next = { day, doors: [] as VisitDoor[] };
      found.set(id, next);
      return next;
    }
    return day === prev.day ? prev : null;
  }
  for (const row of days) {
    for (const id of row.userIds) {
      const clean = (id ?? "").trim();
      if (clean) keep(clean, row.day);
    }
  }
  for (const row of doors) {
    for (const id of row.userIds) {
      const clean = (id ?? "").trim();
      if (!clean) continue;
      const slot = keep(clean, row.day);
      if (slot && !slot.doors.includes(row.door)) slot.doors.push(row.door);
    }
  }
  return [...found.entries()].map(([userId, row]) => ({
    userId,
    day: row.day,
    doors: [...row.doors].sort((a, b) => DOOR_ORDER.indexOf(a) - DOOR_ORDER.indexOf(b)),
  }));
}

export function utcDay(at = Date.now()) {
  return new Date(at).toISOString().slice(0, 10);
}

export function daysBack(from: string, n: number) {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  if (!Number.isFinite(start)) return from;
  return utcDay(start - Math.max(0, n) * 86_400_000);
}

export function visitKind(signedIn: boolean): VisitKind {
  return signedIn ? "player" : "guest";
}

export function visitKey(kind: VisitKind, id: string) {
  const clean = (id ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return clean ? `${kind === "player" ? "p" : "g"}:${clean}` : "";
}

const DOORS: VisitDoor[] = ["home", "news", "jobs", "games", "network", "table", "gate", "other"];

export function parseVisitDoor(raw: string): VisitDoor {
  const door = (raw ?? "").trim().toLowerCase();
  return (DOORS as string[]).includes(door) ? (door as VisitDoor) : "other";
}

export function visitDoor(path: string): VisitDoor {
  const clean = (path.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  if (clean === "/") return "home";
  if (clean === "/news" || clean.startsWith("/news/")) return "news";
  if (clean === "/jobs" || clean.startsWith("/jobs/") || clean === "/manage") return "jobs";
  if (clean === "/wait" || clean.startsWith("/wait/")) return "games";
  if (clean === "/network" || clean.startsWith("/network/")) return "network";
  if (clean.startsWith("/rooms/") || clean.startsWith("/take/")) return "table";
  if (clean === "/signin") return "gate";
  return "other";
}

export function isVisitBot(ua: string) {
  return /bot|crawl|spider|slurp|bingpreview|huepotnewsbot/i.test(ua ?? "");
}

export function liveRoll(rows: LivePing[], now = Date.now()): VisitSlice {
  const ids = new Set<string>();
  let guests = 0;
  let unnamed = 0;
  for (const row of rows) {
    if (now - row.at >= LIVE_MS) continue;
    if (row.kind === "player" && row.userId) ids.add(row.userId);
    else if (row.kind === "player") unnamed += 1;
    else guests += 1;
  }
  return { userIds: [...ids], guests, unnamed };
}

function whoSlice(rows: WhoRow[]): VisitSlice {
  const ids = new Set<string>();
  const guests = new Set<string>();
  let unnamed = 0;
  for (const row of rows) {
    if (row.userId) ids.add(row.userId);
    else if (row.kind === "player") unnamed += 1;
    else if (row.vid) guests.add(row.vid);
  }
  return { userIds: [...ids], guests: guests.size, unnamed };
}

export function whoRoll(rows: WhoRow[], today: string, weekFrom: string) {
  const weekRows = rows.filter((row) => row.day >= weekFrom && row.day <= today);
  const byDay = new Map<string, WhoRow[]>();
  for (const row of weekRows) {
    const list = byDay.get(row.day) ?? [];
    list.push(row);
    byDay.set(row.day, list);
  }
  const todaySlice = whoSlice(weekRows.filter((row) => row.day === today));
  const weekSlice = whoSlice(weekRows);
  return {
    todayUserIds: todaySlice.userIds,
    todayGuests: todaySlice.guests,
    todayUnnamed: todaySlice.unnamed,
    weekUserIds: weekSlice.userIds,
    weekGuests: weekSlice.guests,
    days: [...byDay.entries()].map(([day, list]) => ({ day, ...whoSlice(list) })),
  };
}

export function liveCounts(rows: LivePing[], now = Date.now()) {
  let guests = 0;
  let players = 0;
  for (const row of rows) {
    if (now - row.at >= LIVE_MS) continue;
    if (row.kind === "player") players += 1;
    else guests += 1;
  }
  return { visitors: guests + players, guests, players };
}

export function emptyDay(day: string): VisitDayRow {
  return { day, hits: 0, visitors: 0, guests: 0, players: 0 };
}

export function fillWeekDays(days: VisitDayRow[], end = utcDay()) {
  const map = new Map(days.map((row) => [row.day, row]));
  return [6, 5, 4, 3, 2, 1, 0].map((n) => map.get(daysBack(end, n)) ?? emptyDay(daysBack(end, n)));
}

export type DeskTraffic = {
  now: { visitors: number; guests: number; players: number };
  today: VisitDayRow;
  week: { hits: number; visitors: number };
  days: VisitDayRow[];
  doors: { door: VisitDoor; hits: number }[];
  accounts: number;
  applications: number;
  openApplications: number;
  openReports: number;
};

export function deskTraffic(input: {
  now: { visitors: number; guests: number; players: number };
  today?: VisitDayRow | null;
  weekHits: number;
  weekVisitors: number;
  days: VisitDayRow[];
  doors: { door: string; hits: number }[];
  accounts: number;
  applications: number;
  openApplications: number;
  openReports?: number;
  day?: string;
}): DeskTraffic {
  const today = input.today ?? emptyDay(input.day ?? utcDay());
  const doors = input.doors.map((row) => ({
    door: parseVisitDoor(row.door),
    hits: Math.max(0, Math.floor(row.hits)),
  }));
  return {
    now: input.now,
    today,
    week: {
      hits: Math.max(0, Math.floor(input.weekHits)),
      visitors: Math.max(0, Math.floor(input.weekVisitors)),
    },
    days: fillWeekDays(input.days, today.day),
    doors,
    accounts: Math.max(0, Math.floor(input.accounts)),
    applications: Math.max(0, Math.floor(input.applications)),
    openApplications: Math.max(0, Math.floor(input.openApplications)),
    openReports: Math.max(0, Math.floor(input.openReports ?? 0)),
  };
}
