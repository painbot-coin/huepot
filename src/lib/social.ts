import { prisma } from "@/lib/db";
import {
  findPlayer,
  friendCount,
  headlineOf,
  listSuggestedPeople,
  pendingInCount,
  playerRelation,
  seatedAt,
} from "@/lib/friends";
import { isHouseUser } from "@/lib/house";
import { playBlock } from "@/lib/limits";
import { notify } from "@/lib/notifications";
import { isOnline, presenceAt, touchPresence } from "@/lib/presence";
import { emptyRecord } from "@/lib/record";
import type {
  NetworkMessage,
  NetworkPost,
  NetworkProfile,
  NetworkThread,
  StoreData,
  User,
} from "@/lib/types";

const POST_MAX = 500;
const COMMENT_MAX = 240;
const MESSAGE_MAX = 500;
const HEADLINE_MAX = 80;
const ABOUT_MAX = 500;
const LOCATION_MAX = 40;
const POST_DAY_CAP = 20;
const MESSAGE_DAY_CAP = 40;
const COMMENT_DAY_CAP = 80;

function esc(value: string) {
  return value.replace(/'/g, "''");
}

function clean(raw: string, max: number) {
  return raw.replace(/\s+/g, " ").trim().slice(0, max);
}

function dayStart(at = Date.now()) {
  const date = new Date(at);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

let socialReady = false;

export async function readySocial() {
  if (socialReady) return;
  await ensureSocialTables();
}

export async function ensureSocialTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS NetworkPost (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      body TEXT NOT NULL,
      createdAt BIGINT NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS NetworkLike (
      postId TEXT NOT NULL,
      userId TEXT NOT NULL,
      PRIMARY KEY (postId, userId)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS NetworkComment (
      id TEXT PRIMARY KEY,
      postId TEXT NOT NULL,
      userId TEXT NOT NULL,
      body TEXT NOT NULL,
      createdAt BIGINT NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS NetworkMessage (
      id TEXT PRIMARY KEY,
      fromId TEXT NOT NULL,
      toId TEXT NOT NULL,
      body TEXT NOT NULL,
      createdAt BIGINT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0
    )
  `);
  socialReady = true;
}

export function unreadMessageCount(userId: string) {
  return unreadCache.get(userId) ?? 0;
}

const unreadCache = new Map<string, number>();

export async function refreshUnread(userId: string) {
  const rows = await prisma.$queryRawUnsafe<{ n: number | bigint }[]>(
    `SELECT COUNT(*) as n FROM NetworkMessage WHERE toId='${esc(userId)}' AND read=0`,
  );
  const n = Number(rows[0]?.n ?? 0);
  unreadCache.set(userId, n);
  return n;
}

export function youPayload(viewer: User) {
  return {
    username: viewer.username,
    headline: headlineOf(viewer),
    pendingIn: pendingInCount(viewer.id),
    unreadMessages: unreadCache.get(viewer.id) ?? 0,
    friends: friendCount(viewer.id),
  };
}

export function publicProfile(store: StoreData, viewer: User, username: string): NetworkProfile {
  const self = username.trim().toLowerCase() === viewer.username.toLowerCase();
  const user = self ? viewer : findPlayer(store, username);
  return {
    username: user.username,
    headline: headlineOf(user),
    about: (user.about ?? "").trim(),
    location: (user.location ?? "").trim(),
    createdAt: user.createdAt,
    online: isOnline(user.id),
    lastSeen: presenceAt(user.id),
    room: seatedAt(store, user.id),
    relation: self ? "friends" : playerRelation(viewer.id, user.id),
    friends: friendCount(user.id),
    you: self,
    record: emptyRecord(),
  };
}

export function saveProfile(
  store: StoreData,
  user: User,
  input: { headline?: string; about?: string; location?: string },
) {
  if (typeof input.headline === "string") user.headline = clean(input.headline, HEADLINE_MAX);
  if (typeof input.about === "string") user.about = input.about.trim().slice(0, ABOUT_MAX);
  if (typeof input.location === "string") user.location = clean(input.location, LOCATION_MAX);
  return publicProfile(store, user, user.username);
}

type PostRow = { id: string; userId: string; body: string; createdAt: number | bigint | string };

async function hydratePosts(store: StoreData, viewer: User, posts: PostRow[]): Promise<NetworkPost[]> {
  const ids = posts.map((post) => `'${esc(post.id)}'`).join(",");
  const likes = ids
    ? await prisma.$queryRawUnsafe<{ postId: string; userId: string }[]>(
        `SELECT postId, userId FROM NetworkLike WHERE postId IN (${ids})`,
      )
    : [];
  const comments = ids
    ? await prisma.$queryRawUnsafe<
        { id: string; postId: string; userId: string; body: string; createdAt: number | bigint | string }[]
      >(
        `SELECT id, postId, userId, body, CAST(createdAt AS TEXT) as createdAt FROM NetworkComment WHERE postId IN (${ids}) ORDER BY createdAt ASC`,
      )
    : [];
  return posts.flatMap((post) => {
    const author = store.users[post.userId];
    if (!author || isHouseUser(author)) return [];
    const postLikes = likes.filter((item) => item.postId === post.id);
    return [
      {
        id: post.id,
        username: author.username,
        headline: headlineOf(author),
        body: post.body,
        createdAt: Number(post.createdAt),
        likes: postLikes.length,
        liked: postLikes.some((item) => item.userId === viewer.id),
        relation: playerRelation(viewer.id, author.id),
        comments: comments
          .filter((item) => item.postId === post.id)
          .slice(-4)
          .flatMap((item) => {
            const who = store.users[item.userId];
            if (!who) return [];
            return [
              {
                id: item.id,
                username: who.username,
                body: item.body,
                createdAt: Number(item.createdAt),
              },
            ];
          }),
      },
    ];
  });
}

export async function listFeed(store: StoreData, viewer: User): Promise<NetworkPost[]> {
  touchPresence(viewer.id);
  const posts = await prisma.$queryRawUnsafe<PostRow[]>(
    "SELECT id, userId, body, CAST(createdAt AS TEXT) as createdAt FROM NetworkPost ORDER BY createdAt DESC LIMIT 80",
  );
  return hydratePosts(store, viewer, posts);
}

function recommendScore(post: NetworkPost, viewerName: string) {
  const ageHours = Math.max(0, (Date.now() - post.createdAt) / 3_600_000);
  const recency = Math.max(0, 72 - ageHours);
  const other = post.username.toLowerCase() === viewerName ? 0 : 6;
  const open = post.relation === "none" ? 3 : 0;
  return post.likes * 4 + post.comments.length * 3 + recency + other + open;
}

export function recommendPosts(posts: NetworkPost[], viewer: User): NetworkPost[] {
  const name = viewer.username.toLowerCase();
  const ranked = [...posts].sort((a, b) => recommendScore(b, name) - recommendScore(a, name));
  const others = ranked.filter((post) => post.username.toLowerCase() !== name);
  return (others.length ? others : ranked).slice(0, 40);
}

export async function packFeed(store: StoreData, viewer: User) {
  const posts = await listFeed(store, viewer);
  return {
    posts,
    recommended: recommendPosts(posts, viewer),
    people: listSuggestedPeople(store, viewer, 8),
  };
}

export async function listAuthorPosts(store: StoreData, viewer: User, authorId: string): Promise<NetworkPost[]> {
  const posts = await prisma.$queryRawUnsafe<PostRow[]>(
    `SELECT id, userId, body, CAST(createdAt AS TEXT) as createdAt FROM NetworkPost WHERE userId='${esc(authorId)}' ORDER BY createdAt DESC LIMIT 12`,
  );
  return hydratePosts(store, viewer, posts);
}

function assertCanSocialize(user: User) {
  const block = playBlock(user);
  if (block?.kind === "frozen" || block?.kind === "self-exclude") {
    throw new Error(block.message);
  }
}

export async function createPost(store: StoreData, viewer: User, raw: string) {
  assertCanSocialize(viewer);
  const body = raw.trim().slice(0, POST_MAX);
  if (body.length < 2) throw new Error("Write a little more.");
  const since = dayStart();
  const today = await prisma.$queryRaw<{ n: number | bigint }[]>`
    SELECT COUNT(*) as n FROM NetworkPost WHERE userId = ${viewer.id} AND createdAt >= ${since}
  `;
  if (Number(today[0]?.n ?? 0) >= POST_DAY_CAP) {
    throw new Error("That is enough posts for today.");
  }
  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO NetworkPost (id, userId, body, createdAt) VALUES (${id}, ${viewer.id}, ${body}, ${Date.now()})
  `;
  return listFeed(store, viewer);
}

export async function toggleLike(store: StoreData, viewer: User, postId: string) {
  assertCanSocialize(viewer);
  const id = postId.replace(/[^a-zA-Z0-9-]/g, "");
  const existing = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT userId FROM NetworkLike WHERE postId = ${id} AND userId = ${viewer.id} LIMIT 1
  `;
  if (existing[0]) {
    await prisma.$executeRaw`
      DELETE FROM NetworkLike WHERE postId = ${id} AND userId = ${viewer.id}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO NetworkLike (postId, userId) VALUES (${id}, ${viewer.id})
    `;
  }
  return listFeed(store, viewer);
}

export async function addComment(store: StoreData, viewer: User, postId: string, raw: string) {
  assertCanSocialize(viewer);
  const body = raw.trim().slice(0, COMMENT_MAX);
  if (body.length < 1) throw new Error("Write a comment.");
  const id = postId.replace(/[^a-zA-Z0-9-]/g, "");
  const post = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT userId FROM NetworkPost WHERE id = ${id} LIMIT 1
  `;
  if (!post[0]) throw new Error("That post is gone.");
  const since = dayStart();
  const today = await prisma.$queryRaw<{ n: number | bigint }[]>`
    SELECT COUNT(*) as n FROM NetworkComment WHERE userId = ${viewer.id} AND createdAt >= ${since}
  `;
  if (Number(today[0]?.n ?? 0) >= COMMENT_DAY_CAP) {
    throw new Error("That is enough comments for today.");
  }
  const commentId = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO NetworkComment (id, postId, userId, body, createdAt)
    VALUES (${commentId}, ${id}, ${viewer.id}, ${body}, ${Date.now()})
  `;
  const author = store.users[post[0].userId];
  if (author && author.id !== viewer.id) {
    notify(store, author.id, {
      kind: "post",
      title: "New comment",
      body: `@${viewer.username} commented on your post.`,
      href: "/network",
    });
  }
  return listFeed(store, viewer);
}

export async function listInbox(store: StoreData, viewer: User): Promise<NetworkThread[]> {
  const rows = await prisma.$queryRawUnsafe<
    { fromId: string; toId: string; body: string; createdAt: number | bigint | string; read: number | boolean }[]
  >(
    `SELECT fromId, toId, body, CAST(createdAt AS TEXT) as createdAt, read FROM NetworkMessage WHERE fromId='${esc(viewer.id)}' OR toId='${esc(viewer.id)}' ORDER BY createdAt DESC LIMIT 400`,
  );
  const threads = new Map<string, NetworkThread>();
  for (const row of rows) {
    const otherId = row.fromId === viewer.id ? row.toId : row.fromId;
    if (threads.has(otherId)) {
      const thread = threads.get(otherId)!;
      if (row.toId === viewer.id && !row.read) thread.unread += 1;
      continue;
    }
    const other = store.users[otherId];
    if (!other || isHouseUser(other)) continue;
    threads.set(otherId, {
      username: other.username,
      headline: headlineOf(other),
      lastBody: row.body,
      lastAt: Number(row.createdAt),
      unread: row.toId === viewer.id && !row.read ? 1 : 0,
      online: isOnline(other.id),
    });
  }
  return [...threads.values()];
}

export async function listThread(
  store: StoreData,
  viewer: User,
  username: string,
): Promise<{ with: string; messages: NetworkMessage[] }> {
  const other = findPlayer(store, username);
  await prisma.$executeRawUnsafe(
    `UPDATE NetworkMessage SET read=1 WHERE fromId='${esc(other.id)}' AND toId='${esc(viewer.id)}'`,
  );
  await refreshUnread(viewer.id);
  const rows = await prisma.$queryRawUnsafe<
    { id: string; fromId: string; body: string; createdAt: number | bigint | string }[]
  >(
    `SELECT id, fromId, body, CAST(createdAt AS TEXT) as createdAt FROM NetworkMessage WHERE (fromId='${esc(viewer.id)}' AND toId='${esc(other.id)}') OR (fromId='${esc(other.id)}' AND toId='${esc(viewer.id)}') ORDER BY createdAt ASC LIMIT 200`,
  );
  return {
    with: other.username,
    messages: rows.map((row) => ({
      id: row.id,
      fromYou: row.fromId === viewer.id,
      body: row.body,
      createdAt: Number(row.createdAt),
    })),
  };
}

export async function sendMessage(store: StoreData, viewer: User, username: string, raw: string) {
  assertCanSocialize(viewer);
  const other = findPlayer(store, username);
  if (other.id === viewer.id) throw new Error("Message someone else.");
  const body = raw.trim().slice(0, MESSAGE_MAX);
  if (body.length < 1) throw new Error("Write a message.");
  const since = dayStart();
  const today = await prisma.$queryRaw<{ n: number | bigint }[]>`
    SELECT COUNT(*) as n FROM NetworkMessage WHERE fromId = ${viewer.id} AND createdAt >= ${since}
  `;
  if (Number(today[0]?.n ?? 0) >= MESSAGE_DAY_CAP) {
    throw new Error("That is enough messages for today.");
  }
  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO NetworkMessage (id, fromId, toId, body, createdAt, read)
    VALUES (${id}, ${viewer.id}, ${other.id}, ${body}, ${Date.now()}, 0)
  `;
  notify(store, other.id, {
    kind: "message",
    title: "New message",
    body: `@${viewer.username} sent you a note.`,
    href: `/network/messages?with=${encodeURIComponent(viewer.username)}`,
  });
  unreadCache.set(other.id, (unreadCache.get(other.id) ?? 0) + 1);
  return listThread(store, viewer, other.username);
}
