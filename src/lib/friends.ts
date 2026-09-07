import { prisma } from "@/lib/db";
import { HOUSE_USER_ID, isHouseUser } from "@/lib/house";
import { playBlock } from "@/lib/limits";
import { notify } from "@/lib/notifications";
import { isOnline, presenceAt, touchPresence } from "@/lib/presence";
import type {
  FriendRelation,
  Friendship,
  FriendStatus,
  NetworkCard,
  NetworkTab,
  StoreData,
  User,
} from "@/lib/types";

const PENDING_OUT_CAP = 40;
const DECLINE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const PIT_LIMIT = 200;

let rows: Friendship[] = [];
let loaded = false;

function esc(value: string) {
  return value.replace(/'/g, "''");
}

function pairIds(a: string, b: string) {
  return a < b ? ([a, b] as const) : ([b, a] as const);
}

function otherId(row: Friendship, userId: string) {
  return row.lowId === userId ? row.highId : row.lowId;
}

export async function readyFriends() {
  if (loaded) return;
  await ensureFriendTables();
}

export async function ensureFriendTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Friendship (
      id TEXT PRIMARY KEY,
      lowId TEXT NOT NULL,
      highId TEXT NOT NULL,
      fromId TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt BIGINT NOT NULL,
      resolvedAt BIGINT,
      UNIQUE(lowId, highId)
    )
  `);
  await loadFriendships();
}

async function loadFriendships() {
  const data = await prisma.$queryRawUnsafe<
    {
      id: string;
      lowId: string;
      highId: string;
      fromId: string;
      status: string;
      createdAt: number | bigint | string;
      resolvedAt: number | bigint | string | null;
    }[]
  >(
    "SELECT id, lowId, highId, fromId, status, CAST(createdAt AS TEXT) as createdAt, CAST(resolvedAt AS TEXT) as resolvedAt FROM Friendship",
  );
  rows = data.map((row) => ({
    id: row.id,
    lowId: row.lowId,
    highId: row.highId,
    fromId: row.fromId,
    status: row.status as FriendStatus,
    createdAt: Number(row.createdAt),
    resolvedAt: row.resolvedAt == null || row.resolvedAt === "" ? null : Number(row.resolvedAt),
  }));
  loaded = true;
}

function allRows() {
  if (!loaded) throw new Error("Friendships are not ready.");
  return rows;
}

function findPair(a: string, b: string) {
  const [lowId, highId] = pairIds(a, b);
  return allRows().find((row) => row.lowId === lowId && row.highId === highId) ?? null;
}

function relationFor(row: Friendship | null, viewerId: string): FriendRelation {
  if (!row || row.status === "declined") return "none";
  if (row.status === "accepted") return "friends";
  return row.fromId === viewerId ? "outgoing" : "incoming";
}

async function insertRow(row: Friendship) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO Friendship (id, lowId, highId, fromId, status, createdAt, resolvedAt)
     VALUES ('${esc(row.id)}', '${esc(row.lowId)}', '${esc(row.highId)}', '${esc(row.fromId)}', '${esc(row.status)}', ${row.createdAt}, ${row.resolvedAt == null ? "NULL" : row.resolvedAt})`,
  );
  rows.push(row);
}

async function updateRow(row: Friendship) {
  await prisma.$executeRawUnsafe(
    `UPDATE Friendship SET status='${esc(row.status)}', fromId='${esc(row.fromId)}', createdAt=${row.createdAt}, resolvedAt=${row.resolvedAt == null ? "NULL" : row.resolvedAt} WHERE id='${esc(row.id)}'`,
  );
}

async function deleteRow(id: string) {
  await prisma.$executeRawUnsafe(`DELETE FROM Friendship WHERE id='${esc(id)}'`);
  rows = rows.filter((row) => row.id !== id);
}

function seatedRoom(store: StoreData, userId: string) {
  const room = Object.values(store.rooms).find((item) => {
    const round = item.round;
    if (!round) return false;
    const clicks = round.clicks[userId];
    if (!clicks) return false;
    return round.buttonIds.some((id) => (clicks[id] ?? 0) > 0);
  });
  return room ? { slug: room.slug, name: room.name } : null;
}

export function friendCount(userId: string) {
  return allRows().filter(
    (row) =>
      row.status === "accepted" && (row.lowId === userId || row.highId === userId),
  ).length;
}

export function headlineOf(user: User) {
  return (user.headline ?? "").trim() || "Huepot player";
}

function toCard(store: StoreData, viewerId: string, user: User, at: number): NetworkCard {
  const row = findPair(viewerId, user.id);
  return {
    username: user.username,
    avatar: (user.avatar ?? "").trim(),
    headline: headlineOf(user),
    createdAt: user.createdAt,
    online: isOnline(user.id, at),
    lastSeen: presenceAt(user.id),
    room: seatedRoom(store, user.id),
    relation: relationFor(row, viewerId),
    friends: friendCount(user.id),
  };
}

function visibleUsers(store: StoreData) {
  return Object.values(store.users).filter((user) => !isHouseUser(user) && user.id !== HOUSE_USER_ID);
}

function sortCards(cards: NetworkCard[]) {
  return [...cards].sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    if (Boolean(a.room) !== Boolean(b.room)) return a.room ? -1 : 1;
    return a.username.localeCompare(b.username);
  });
}

export function pendingInCount(userId: string) {
  return allRows().filter(
    (row) => row.status === "pending" && row.fromId !== userId && (row.lowId === userId || row.highId === userId),
  ).length;
}

export function listNetwork(
  store: StoreData,
  viewer: User,
  tab: NetworkTab,
  query: string,
  focus = "",
) {
  const at = Date.now();
  touchPresence(viewer.id, at);
  const q = query.trim().toLowerCase();
  const focusName = focus.trim().toLowerCase();
  const people = visibleUsers(store).filter((user) => user.id !== viewer.id);

  let picked = people;
  if (tab === "friends") {
    picked = people.filter((user) => relationFor(findPair(viewer.id, user.id), viewer.id) === "friends");
  } else if (tab === "requests") {
    picked = people.filter((user) => {
      const relation = relationFor(findPair(viewer.id, user.id), viewer.id);
      return relation === "incoming" || relation === "outgoing";
    });
  }

  if (q) {
    picked = picked.filter((user) => user.username.toLowerCase().includes(q));
  }

  if (focusName && tab === "pit") {
    const focused = people.find((user) => user.username.toLowerCase() === focusName);
    if (focused && !picked.some((user) => user.id === focused.id)) {
      picked = [focused, ...picked];
    }
  }

  const cards = sortCards(picked.map((user) => toCard(store, viewer.id, user, at)));
  const limited = tab === "pit" && !q ? cards.slice(0, PIT_LIMIT) : cards.slice(0, 200);

  if (tab === "pit") {
    const order: Record<FriendRelation, number> = {
      none: 0,
      incoming: 1,
      outgoing: 2,
      friends: 3,
    };
    limited.sort((a, b) => {
      const rel = order[a.relation] - order[b.relation];
      if (rel !== 0) return rel;
      if (a.online !== b.online) return a.online ? -1 : 1;
      return a.username.localeCompare(b.username);
    });
  }

  if (tab === "requests") {
    limited.sort((a, b) => {
      if (a.relation !== b.relation) return a.relation === "incoming" ? -1 : 1;
      return a.username.localeCompare(b.username);
    });
  }

  if (focusName && tab === "pit") {
    limited.sort((a, b) => {
      const aHit = a.username.toLowerCase() === focusName ? 0 : 1;
      const bHit = b.username.toLowerCase() === focusName ? 0 : 1;
      return aHit - bHit;
    });
  }

  return {
    now: at,
    tab,
    q: query.trim(),
    pendingIn: pendingInCount(viewer.id),
    you: {
      username: viewer.username,
      headline: headlineOf(viewer),
      pendingIn: pendingInCount(viewer.id),
      unreadMessages: 0,
      friends: friendCount(viewer.id),
    },
    cards: limited,
  };
}

export function listSuggestedPeople(store: StoreData, viewer: User, limit = 8): NetworkCard[] {
  const at = Date.now();
  const cards = visibleUsers(store)
    .filter((user) => user.id !== viewer.id)
    .map((user) => toCard(store, viewer.id, user, at));
  const open = sortCards(cards.filter((card) => card.relation === "none"));
  const pending = sortCards(
    cards.filter((card) => card.relation === "incoming" || card.relation === "outgoing"),
  );
  return [...open, ...pending].slice(0, limit);
}

export function playerRelation(viewerId: string, otherId: string): FriendRelation {
  return relationFor(findPair(viewerId, otherId), viewerId);
}

export function seatedAt(store: StoreData, userId: string) {
  return seatedRoom(store, userId);
}

export function findPlayer(store: StoreData, username: string) {
  return requirePlayer(store, username);
}

function requirePlayer(store: StoreData, username: string) {
  const needle = username.trim().toLowerCase();
  const user = Object.values(store.users).find(
    (item) => item.username.toLowerCase() === needle,
  );
  if (!user || isHouseUser(user)) throw new Error("That player was not found.");
  return user;
}

function assertCanRequest(user: User) {
  const block = playBlock(user);
  if (block?.kind === "frozen" || block?.kind === "self-exclude") {
    throw new Error(block.message);
  }
}

export async function sendFriendRequest(store: StoreData, viewer: User, username: string) {
  assertCanRequest(viewer);
  const target = requirePlayer(store, username);
  if (target.id === viewer.id) throw new Error("You cannot add yourself.");
  const existing = findPair(viewer.id, target.id);
  if (existing?.status === "accepted") throw new Error("You are already friends.");
  if (existing?.status === "pending") {
    throw new Error(existing.fromId === viewer.id ? "Request already sent." : "They already sent you a request.");
  }
  if (
    existing?.status === "declined" &&
    existing.resolvedAt &&
    Date.now() - existing.resolvedAt < DECLINE_COOLDOWN_MS
  ) {
    throw new Error("Wait a day before asking again.");
  }
  const outgoing = allRows().filter(
    (row) => row.status === "pending" && row.fromId === viewer.id,
  ).length;
  if (outgoing >= PENDING_OUT_CAP) {
    throw new Error("Too many pending invites. Wait for replies.");
  }

  const [lowId, highId] = pairIds(viewer.id, target.id);
  const at = Date.now();
  if (existing) {
    existing.fromId = viewer.id;
    existing.status = "pending";
    existing.createdAt = at;
    existing.resolvedAt = null;
    await updateRow(existing);
  } else {
    await insertRow({
      id: crypto.randomUUID(),
      lowId,
      highId,
      fromId: viewer.id,
      status: "pending",
      createdAt: at,
      resolvedAt: null,
    });
  }
  notify(store, target.id, {
    kind: "friend",
    title: "Friend request",
    body: `@${viewer.username} wants to add you.`,
    href: "/network/people?tab=requests",
  });
}

export async function acceptFriendRequest(store: StoreData, viewer: User, username: string) {
  const target = requirePlayer(store, username);
  const row = findPair(viewer.id, target.id);
  if (!row || row.status !== "pending" || row.fromId === viewer.id) {
    throw new Error("That request is not waiting on you.");
  }
  row.status = "accepted";
  row.resolvedAt = Date.now();
  await updateRow(row);
  notify(store, target.id, {
    kind: "friend",
    title: "Friend accepted",
    body: `@${viewer.username} accepted. You can sit together.`,
    href: "/network/people?tab=friends",
  });
}

export async function ignoreFriendRequest(_store: StoreData, viewer: User, username: string) {
  const target = requirePlayer(_store, username);
  const row = findPair(viewer.id, target.id);
  if (!row || row.status !== "pending" || row.fromId === viewer.id) {
    throw new Error("That request is not waiting on you.");
  }
  row.status = "declined";
  row.resolvedAt = Date.now();
  await updateRow(row);
}

export async function unfriend(_store: StoreData, viewer: User, username: string) {
  const target = requirePlayer(_store, username);
  const row = findPair(viewer.id, target.id);
  if (!row || row.status !== "accepted") {
    throw new Error("You are not friends.");
  }
  await deleteRow(row.id);
}
