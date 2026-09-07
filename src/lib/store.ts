import { mkdir, readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { ensureFairTables, flushSettledRounds, loadRoundFair } from "@/lib/fairness-db";
import { emptyLimits } from "@/lib/limits";
import { publishRoom } from "@/lib/live";
import { NOTICE_CAP } from "@/lib/notifications";
import { ROOM_EVENT_CAP, ensureRooms } from "@/lib/rooms";
import type {
  Notice,
  Room,
  RoomEvent,
  Round,
  StoreData,
  Tx,
  User,
} from "@/lib/types";

const JSON_STORE_PATH = path.join(process.cwd(), "data", "store.json");

const emptyStore = (): StoreData => ({
  users: {},
  sessions: {},
  oauthStates: {},
  notifications: [],
  rooms: {},
  round: null,
  roundNumber: 0,
  txs: [],
});

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type Epoch = number | bigint;

function ms(value: Epoch | string): number {
  return Number(value);
}

function msOpt(value: Epoch | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  return Number(value);
}

function sqlStr(value: string | null | undefined) {
  if (value == null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlInt(value: number | bigint | boolean | null | undefined) {
  if (value == null) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(typeof value === "bigint" ? value : Math.round(value));
}

function sqlFloat(value: number | null | undefined) {
  if (value == null) return "NULL";
  return Number.isFinite(value) ? String(value) : "0";
}

function userFromRow(
  row: {
    id: string;
    email: string;
    username: string;
    passwordHash: string;
    googleId: string | null;
    emailVerified: boolean;
    verifyToken: string | null;
    verifyExpires: number | bigint | string | null;
    verifySentAt: number | bigint | string | null;
    createdAt: number | bigint | string;
    balance: number;
    withdrawAddress: string;
    wallets: { network: string; address: string; secretEnc: string }[];
  },
): User {
  const wallets: User["wallets"] = {};
  for (const wallet of row.wallets) {
    wallets[wallet.network] = {
      address: wallet.address,
      secretEnc: wallet.secretEnc,
    };
  }
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.passwordHash,
    googleId: row.googleId,
    emailVerified: row.emailVerified,
    verifyToken: row.verifyToken,
    verifyExpires: msOpt(row.verifyExpires),
    verifySentAt: msOpt(row.verifySentAt),
    createdAt: ms(row.createdAt),
    balance: row.balance,
    withdrawAddress: row.withdrawAddress,
    wallets,
    limits: emptyLimits(),
    ageConfirmedAt: null,
    resetToken: null,
    resetExpires: null,
    resetSentAt: null,
    inviteCode: "",
    invitedBy: null,
    headline: "",
    about: "",
    location: "",
  };
}

function roundFromRow(row: {
  id: string;
  number: number;
  status: string;
  startedAt: number | bigint | string;
  endsAt: number | bigint | string;
  revealUntil: number | bigint | string | null;
  clickPrice: number;
  buttonIds: string;
  totals: string;
  clicks: string;
  result: string | null;
}): Round {
  return {
    id: row.id,
    number: row.number,
    status: row.status as Round["status"],
    startedAt: ms(row.startedAt),
    endsAt: ms(row.endsAt),
    revealUntil: msOpt(row.revealUntil),
    clickPrice: row.clickPrice,
    buttonIds: parseJson(row.buttonIds, []),
    totals: parseJson(row.totals, {} as Round["totals"]),
    clicks: parseJson(row.clicks, {} as Round["clicks"]),
    result: parseJson(row.result, null),
    seedCommit: "",
    serverSeed: "",
    fairHash: "",
  };
}

function roomFromRow(row: {
  id: string;
  slug: string;
  name: string;
  kind: string;
  ownerId: string | null;
  buttonCount: number;
  clickPrice: number;
  roundSeconds: number;
  createdAt: number | bigint | string;
  liveMinutes: number | null;
  closesAt: number | bigint | string | null;
  roundNumber: number;
  mutedIds?: string | null;
  seats: { userId: string }[];
  events: {
    id: string;
    kind: string;
    userId: string | null;
    username: string | null;
    body: string;
    createdAt: number | bigint | string;
  }[];
  round: Parameters<typeof roundFromRow>[0] | null;
}): Room {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind as Room["kind"],
    ownerId: row.ownerId,
    buttonCount: row.buttonCount,
    clickPrice: row.clickPrice,
    roundSeconds: row.roundSeconds,
    fogSeconds: null,
    createdAt: ms(row.createdAt),
    liveMinutes: row.liveMinutes,
    closesAt: msOpt(row.closesAt),
    roundNumber: row.roundNumber,
    mutedIds: parseJson(row.mutedIds, [] as string[]),
    paused: false,
    pausedAt: null,
    slowMode: false,
    playerIds: row.seats.map((seat) => seat.userId),
    events: row.events.map(
      (event): RoomEvent => ({
        id: event.id,
        kind: event.kind as RoomEvent["kind"],
        userId: event.userId,
        username: event.username,
        body: event.body,
        createdAt: ms(event.createdAt),
      }),
    ),
    round: row.round ? roundFromRow(row.round) : null,
  };
}

async function loadRoomFlags() {
  try {
    const rows = await prisma.$queryRawUnsafe<
      { id: string; paused: number | boolean | null; pausedAt: number | bigint | string | null; slowMode: number | boolean | null }[]
    >("SELECT id, paused, CAST(pausedAt AS TEXT) as pausedAt, slowMode FROM Room");
    return new Map(
      rows.map((row) => [
        row.id,
        {
          paused: Boolean(row.paused),
          pausedAt: msOpt(row.pausedAt),
          slowMode: Boolean(row.slowMode),
        },
      ]),
    );
  } catch {
    return new Map<string, { paused: boolean; pausedAt: number | null; slowMode: boolean }>();
  }
}

async function loadFogSeconds() {
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string; fogSeconds: number | null }[]>(
      "SELECT id, fogSeconds FROM Room",
    );
    return new Map(rows.map((row) => [row.id, row.fogSeconds ?? null]));
  } catch {
    return new Map<string, number | null>();
  }
}

async function loadMutedIds() {
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string; mutedIds: string | null }[]>(
      "SELECT id, mutedIds FROM Room",
    );
    return new Map(rows.map((row) => [row.id, parseJson(row.mutedIds, [] as string[])]));
  } catch {
    return new Map<string, string[]>();
  }
}

async function loadUserAuth() {
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string; auth: string | null }[]>(
      "SELECT id, auth FROM User",
    );
    return new Map(
      rows.map((row) => {
        const parsed = parseJson(row.auth, {
          ageConfirmedAt: null as number | null,
          resetToken: null as string | null,
          resetExpires: null as number | null,
          resetSentAt: null as number | null,
          inviteCode: "",
          invitedBy: null as string | null,
          headline: "",
          about: "",
          location: "",
        });
        return [row.id, parsed] as const;
      }),
    );
  } catch {
    return new Map<
      string,
      {
        ageConfirmedAt: number | null;
        resetToken: string | null;
        resetExpires: number | null;
        resetSentAt: number | null;
        inviteCode: string;
        invitedBy: string | null;
        headline: string;
        about: string;
        location: string;
      }
    >();
  }
}

async function loadSessionExtra() {
  try {
    const rows = await prisma.$queryRawUnsafe<
      { token: string; createdAt: number | null; userAgent: string | null }[]
    >("SELECT token, createdAt, userAgent FROM Session");
    return new Map(
      rows.map((row) => [
        row.token,
        { createdAt: Number(row.createdAt ?? 0), userAgent: row.userAgent ?? "" },
      ]),
    );
  } catch {
    return new Map<string, { createdAt: number; userAgent: string }>();
  }
}

async function loadUserLimits() {
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string; limits: string | null }[]>(
      "SELECT id, limits FROM User",
    );
    return new Map(rows.map((row) => [row.id, { ...emptyLimits(), ...parseJson(row.limits, emptyLimits()) }]));
  } catch {
    return new Map<string, ReturnType<typeof emptyLimits>>();
  }
}

async function readStore(): Promise<StoreData> {
  const [
    userRows,
    walletRows,
    sessionRows,
    oauthRows,
    noticeRows,
    txRows,
    roomRows,
    seatRows,
    eventRows,
    roundRows,
    metaRows,
  ] = await Promise.all([
    prisma.$queryRawUnsafe<
      {
        id: string;
        email: string;
        username: string;
        passwordHash: string;
        googleId: string | null;
        emailVerified: number | boolean;
        verifyToken: string | null;
        verifyExpires: number | bigint | string | null;
        verifySentAt: number | bigint | string | null;
        createdAt: number | bigint | string;
        balance: number;
        withdrawAddress: string;
      }[]
    >("SELECT id, email, username, passwordHash, googleId, emailVerified, verifyToken, CAST(verifyExpires AS TEXT) as verifyExpires, CAST(verifySentAt AS TEXT) as verifySentAt, CAST(createdAt AS TEXT) as createdAt, balance, withdrawAddress FROM User"),
    prisma.$queryRawUnsafe<{ userId: string; network: string; address: string; secretEnc: string }[]>(
      "SELECT userId, network, address, secretEnc FROM Wallet",
    ),
    prisma.$queryRawUnsafe<{ token: string; userId: string; expiresAt: string }[]>(
      "SELECT token, userId, CAST(expiresAt AS TEXT) as expiresAt FROM Session",
    ),
    prisma.$queryRawUnsafe<{ state: string; expiresAt: string }[]>(
      "SELECT state, CAST(expiresAt AS TEXT) as expiresAt FROM OAuthState",
    ),
    prisma.$queryRawUnsafe<
      {
        id: string;
        userId: string;
        kind: string;
        title: string;
        body: string;
        href: string;
        read: number | boolean;
        createdAt: string;
      }[]
    >(
      `SELECT id, userId, kind, title, body, href, read, CAST(createdAt AS TEXT) as createdAt
         FROM Notice ORDER BY createdAt DESC LIMIT ${NOTICE_CAP}`,
    ),
    prisma.$queryRawUnsafe<
      {
        id: string;
        playerId: string;
        type: string;
        amount: number;
        createdAt: string;
        note: string;
      }[]
    >("SELECT id, playerId, type, amount, CAST(createdAt AS TEXT) as createdAt, note FROM Tx ORDER BY createdAt DESC LIMIT 800"),
    prisma.$queryRawUnsafe<
      {
        id: string;
        slug: string;
        name: string;
        kind: string;
        ownerId: string | null;
        buttonCount: number;
        clickPrice: number;
        roundSeconds: number;
        createdAt: string;
        liveMinutes: number | null;
        closesAt: string | null;
        roundNumber: number;
        mutedIds: string | null;
      }[]
    >("SELECT id, slug, name, kind, ownerId, buttonCount, clickPrice, roundSeconds, CAST(createdAt AS TEXT) as createdAt, liveMinutes, CAST(closesAt AS TEXT) as closesAt, roundNumber, mutedIds FROM Room"),
    prisma.$queryRawUnsafe<{ roomId: string; userId: string }[]>("SELECT roomId, userId FROM RoomSeat"),
    prisma.$queryRawUnsafe<
      {
        id: string;
        roomId: string;
        kind: string;
        userId: string | null;
        username: string | null;
        body: string;
        createdAt: string;
      }[]
    >(
      // Only the newest events per room are ever read, so boot does not get
      // slower as the table grows.
      `SELECT id, roomId, kind, userId, username, body, createdAt FROM (
         SELECT id, roomId, kind, userId, username, body,
                CAST(createdAt AS TEXT) AS createdAt,
                ROW_NUMBER() OVER (PARTITION BY roomId ORDER BY createdAt DESC) AS rn
           FROM RoomEvent
       ) WHERE rn <= ${ROOM_EVENT_CAP} ORDER BY createdAt ASC`,
    ),
    prisma.$queryRawUnsafe<
      {
        id: string;
        roomId: string;
        number: number;
        status: string;
        startedAt: string;
        endsAt: string;
        revealUntil: string | null;
        clickPrice: number;
        buttonIds: string;
        totals: string;
        clicks: string;
        result: string | null;
      }[]
    >("SELECT id, roomId, number, status, CAST(startedAt AS TEXT) as startedAt, CAST(endsAt AS TEXT) as endsAt, CAST(revealUntil AS TEXT) as revealUntil, clickPrice, buttonIds, totals, clicks, result FROM Round"),
    prisma.$queryRawUnsafe<{ id: string; roundNumber: number; legacyRound: string | null }[]>(
      "SELECT id, roundNumber, legacyRound FROM Meta WHERE id = 'app' LIMIT 1",
    ),
  ]);

  const walletsByUser = new Map<string, { network: string; address: string; secretEnc: string }[]>();
  for (const wallet of walletRows) {
    const list = walletsByUser.get(wallet.userId) ?? [];
    list.push(wallet);
    walletsByUser.set(wallet.userId, list);
  }
  const seatsByRoom = new Map<string, { userId: string }[]>();
  for (const seat of seatRows) {
    const list = seatsByRoom.get(seat.roomId) ?? [];
    list.push({ userId: seat.userId });
    seatsByRoom.set(seat.roomId, list);
  }
  const eventsByRoom = new Map<string, (typeof eventRows)[number][]>();
  for (const event of eventRows) {
    const list = eventsByRoom.get(event.roomId) ?? [];
    list.push(event);
    eventsByRoom.set(event.roomId, list);
  }
  // A room posting an event trims itself to the cap, but a room that has gone
  // quiet would otherwise carry its whole history for as long as the process
  // lives, and every write clones and serialises all of it.
  for (const [roomId, list] of eventsByRoom) {
    if (list.length > ROOM_EVENT_CAP) {
      eventsByRoom.set(roomId, list.slice(-ROOM_EVENT_CAP));
    }
  }
  const roundByRoom = new Map(roundRows.map((row) => [row.roomId, row]));

  const store = emptyStore();
  for (const user of userRows) {
    store.users[user.id] = userFromRow({
      ...user,
      emailVerified: Boolean(user.emailVerified),
      wallets: walletsByUser.get(user.id) ?? [],
    });
  }
  // An expired session or state cannot be used to sign anyone in, so carrying
  // it only adds to what every write clones and serialises.
  const loadedAt = Date.now();
  for (const session of sessionRows) {
    const expiresAt = ms(session.expiresAt);
    if (expiresAt < loadedAt) continue;
    store.sessions[session.token] = {
      token: session.token,
      userId: session.userId,
      expiresAt,
      createdAt: 0,
      userAgent: "",
    };
  }
  for (const item of oauthRows) {
    const expiresAt = ms(item.expiresAt);
    if (expiresAt < loadedAt) continue;
    store.oauthStates[item.state] = {
      state: item.state,
      expiresAt,
    };
  }
  store.notifications = noticeRows.map(
    (item): Notice => ({
      id: item.id,
      userId: item.userId,
      kind: item.kind as Notice["kind"],
      title: item.title,
      body: item.body,
      href: item.href,
      read: Boolean(item.read),
      createdAt: ms(item.createdAt),
    }),
  );
  store.txs = txRows
    .map(
      (item): Tx => ({
        id: item.id,
        playerId: item.playerId,
        type: item.type as Tx["type"],
        amount: item.amount,
        createdAt: ms(item.createdAt),
        note: item.note,
      }),
    )
    .reverse();
  for (const room of roomRows) {
    store.rooms[room.slug] = roomFromRow({
      ...room,
      seats: seatsByRoom.get(room.id) ?? [],
      events: eventsByRoom.get(room.id) ?? [],
      round: roundByRoom.get(room.id) ?? null,
    });
  }
  const muted = await loadMutedIds();
  for (const room of Object.values(store.rooms)) {
    if (muted.has(room.id)) room.mutedIds = muted.get(room.id) ?? [];
    else room.mutedIds ??= [];
  }
  const flags = await loadRoomFlags();
  for (const room of Object.values(store.rooms)) {
    const extra = flags.get(room.id);
    if (!extra) {
      room.paused ??= false;
      room.pausedAt ??= null;
      room.slowMode ??= false;
      continue;
    }
    room.paused = extra.paused;
    room.pausedAt = extra.pausedAt;
    room.slowMode = extra.slowMode;
  }
  const fogMap = await loadFogSeconds();
  for (const room of Object.values(store.rooms)) {
    if (fogMap.has(room.id)) room.fogSeconds = fogMap.get(room.id) ?? null;
    else room.fogSeconds ??= null;
  }
  const fair = await loadRoundFair();
  for (const room of Object.values(store.rooms)) {
    if (!room.round) continue;
    const extra = fair.get(room.round.id);
    if (!extra) continue;
    room.round.seedCommit = extra.seedCommit || room.round.seedCommit;
    room.round.serverSeed = extra.serverSeed || room.round.serverSeed;
    room.round.fairHash = extra.fairHash || room.round.fairHash;
  }
  const limitsMap = await loadUserLimits();
  for (const user of Object.values(store.users)) {
    user.limits = limitsMap.get(user.id) ?? emptyLimits();
  }
  const authMap = await loadUserAuth();
  for (const user of Object.values(store.users)) {
    const extra = authMap.get(user.id);
    if (!extra) continue;
    user.ageConfirmedAt = extra.ageConfirmedAt;
    user.resetToken = extra.resetToken;
    user.resetExpires = extra.resetExpires;
    user.resetSentAt = extra.resetSentAt;
    user.inviteCode = extra.inviteCode ?? "";
    user.invitedBy = extra.invitedBy ?? null;
    user.headline = extra.headline ?? "";
    user.about = extra.about ?? "";
    user.location = extra.location ?? "";
  }
  const sessionExtra = await loadSessionExtra();
  for (const session of Object.values(store.sessions)) {
    const extra = sessionExtra.get(session.token);
    if (!extra) continue;
    session.createdAt = extra.createdAt;
    session.userAgent = extra.userAgent;
  }
  store.roundNumber = metaRows[0]?.roundNumber ?? 0;
  store.round = parseJson(metaRows[0]?.legacyRound ?? null, null);
  ensureRooms(store);
  return store;
}

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function roundRow(roomId: string, round: Round) {
  return {
    id: round.id,
    roomId,
    number: round.number,
    status: round.status,
    startedAt: round.startedAt,
    endsAt: round.endsAt,
    revealUntil: round.revealUntil,
    clickPrice: round.clickPrice,
    buttonIds: JSON.stringify(round.buttonIds),
    totals: JSON.stringify(round.totals),
    clicks: JSON.stringify(round.clicks),
    result: round.result ? JSON.stringify(round.result) : null,
  };
}

async function persistStore(prev: StoreData, next: StoreData) {
  if (same(prev, next)) {
    await flushSettledRounds();
    return;
  }

  const userIdSet = new Set(Object.keys(next.users));

  await prisma.$transaction(
    async (tx) => {
      const removedUsers = Object.keys(prev.users).filter((id) => !next.users[id]);
      if (removedUsers.length) {
        await tx.user.deleteMany({ where: { id: { in: removedUsers } } });
      }

      for (const user of Object.values(next.users)) {
        const before = prev.users[user.id];
        if (same(before, user)) continue;
        await tx.$executeRawUnsafe(
          `INSERT INTO User (id, email, username, passwordHash, googleId, emailVerified, verifyToken, verifyExpires, verifySentAt, createdAt, balance, withdrawAddress)
           VALUES (${sqlStr(user.id)}, ${sqlStr(user.email)}, ${sqlStr(user.username)}, ${sqlStr(user.passwordHash)}, ${sqlStr(user.googleId)}, ${sqlInt(user.emailVerified)}, ${sqlStr(user.verifyToken)}, ${sqlInt(user.verifyExpires)}, ${sqlInt(user.verifySentAt)}, ${sqlInt(user.createdAt)}, ${sqlFloat(user.balance)}, ${sqlStr(user.withdrawAddress)})
           ON CONFLICT(id) DO UPDATE SET
             email=excluded.email, username=excluded.username, passwordHash=excluded.passwordHash, googleId=excluded.googleId,
             emailVerified=excluded.emailVerified, verifyToken=excluded.verifyToken, verifyExpires=excluded.verifyExpires,
             verifySentAt=excluded.verifySentAt, createdAt=excluded.createdAt, balance=excluded.balance, withdrawAddress=excluded.withdrawAddress`,
        );
        if (!same(before?.limits, user.limits ?? emptyLimits())) {
          await tx.$executeRawUnsafe(
            `UPDATE User SET limits = '${JSON.stringify(user.limits ?? emptyLimits()).replace(/'/g, "''")}' WHERE id = '${user.id.replace(/'/g, "''")}'`,
          );
        }
        const authJson = JSON.stringify({
          ageConfirmedAt: user.ageConfirmedAt ?? null,
          resetToken: user.resetToken ?? null,
          resetExpires: user.resetExpires ?? null,
          resetSentAt: user.resetSentAt ?? null,
          inviteCode: user.inviteCode ?? "",
          invitedBy: user.invitedBy ?? null,
          headline: user.headline ?? "",
          about: user.about ?? "",
          location: user.location ?? "",
        });
        if (
          !same(before?.ageConfirmedAt, user.ageConfirmedAt) ||
          !same(before?.resetToken, user.resetToken) ||
          !same(before?.resetExpires, user.resetExpires) ||
          !same(before?.inviteCode, user.inviteCode) ||
          !same(before?.invitedBy, user.invitedBy) ||
          !same(before?.headline, user.headline) ||
          !same(before?.about, user.about) ||
          !same(before?.location, user.location)
        ) {
          await tx.$executeRawUnsafe(
            `UPDATE User SET auth = '${authJson.replace(/'/g, "''")}' WHERE id = '${user.id.replace(/'/g, "''")}'`,
          );
        }
        if (!same(before?.wallets, user.wallets)) {
          await tx.wallet.deleteMany({ where: { userId: user.id } });
          const wallets = Object.entries(user.wallets).flatMap(([network, wallet]) =>
            wallet
              ? [
                  {
                    userId: user.id,
                    network,
                    address: wallet.address,
                    secretEnc: wallet.secretEnc,
                  },
                ]
              : [],
          );
          if (wallets.length) await tx.wallet.createMany({ data: wallets });
        }
      }

      for (const session of Object.values(next.sessions)) {
        if (!userIdSet.has(session.userId) || same(prev.sessions[session.token], session)) {
          continue;
        }
        await tx.$executeRawUnsafe(
          `INSERT INTO Session (token, userId, expiresAt, createdAt, userAgent)
           VALUES (${sqlStr(session.token)}, ${sqlStr(session.userId)}, ${sqlInt(session.expiresAt)}, ${sqlInt(session.createdAt || 0)}, ${sqlStr(session.userAgent || "")})
           ON CONFLICT(token) DO UPDATE SET userId=excluded.userId, expiresAt=excluded.expiresAt, createdAt=excluded.createdAt, userAgent=excluded.userAgent`,
        );
      }
      for (const token of Object.keys(prev.sessions)) {
        if (!next.sessions[token]) {
          await tx.session.delete({ where: { token } }).catch(() => undefined);
        }
      }

      for (const item of Object.values(next.oauthStates)) {
        if (same(prev.oauthStates[item.state], item)) continue;
        await tx.$executeRawUnsafe(
          `INSERT INTO OAuthState (state, expiresAt) VALUES (${sqlStr(item.state)}, ${sqlInt(item.expiresAt)})
           ON CONFLICT(state) DO UPDATE SET expiresAt=excluded.expiresAt`,
        );
      }
      for (const state of Object.keys(prev.oauthStates)) {
        if (!next.oauthStates[state]) {
          await tx.oAuthState.delete({ where: { state } }).catch(() => undefined);
        }
      }

      const prevNotices = new Map(prev.notifications.map((item) => [item.id, item]));
      for (const item of next.notifications) {
        if (!userIdSet.has(item.userId)) continue;
        const before = prevNotices.get(item.id);
        if (!before) {
          await tx.$executeRawUnsafe(
            `INSERT INTO Notice (id, userId, kind, title, body, href, read, createdAt)
             VALUES (${sqlStr(item.id)}, ${sqlStr(item.userId)}, ${sqlStr(item.kind)}, ${sqlStr(item.title)}, ${sqlStr(item.body)}, ${sqlStr(item.href)}, ${sqlInt(item.read)}, ${sqlInt(item.createdAt)})
             ON CONFLICT(id) DO UPDATE SET read=excluded.read`,
          );
        } else if (before.read !== item.read) {
          await tx.$executeRawUnsafe(
            `UPDATE Notice SET read = ${sqlInt(item.read)} WHERE id = ${sqlStr(item.id)}`,
          );
        }
      }

      const prevTxIds = new Set(prev.txs.map((item) => item.id));
      const newTxs = next.txs.filter(
        (item) => !prevTxIds.has(item.id) && userIdSet.has(item.playerId),
      );
      if (newTxs.length) {
        const values = newTxs
          .map(
            (item) =>
              `(${sqlStr(item.id)}, ${sqlStr(item.playerId)}, ${sqlStr(item.type)}, ${sqlFloat(item.amount)}, ${sqlInt(item.createdAt)}, ${sqlStr(item.note)})`,
          )
          .join(", ");
        await tx.$executeRawUnsafe(
          `INSERT OR IGNORE INTO Tx (id, playerId, type, amount, createdAt, note) VALUES ${values}`,
        );
      }

      const prevById = new Map(Object.values(prev.rooms).map((room) => [room.id, room]));
      const nextById = new Map(Object.values(next.rooms).map((room) => [room.id, room]));
      for (const id of prevById.keys()) {
        if (!nextById.has(id)) {
          await tx.room.delete({ where: { id } }).catch(() => undefined);
        }
      }

      for (const room of Object.values(next.rooms)) {
        const before = prevById.get(room.id);
        const ownerId = room.ownerId && userIdSet.has(room.ownerId) ? room.ownerId : null;
        if (
          !before ||
          before.slug !== room.slug ||
          before.name !== room.name ||
          before.kind !== room.kind ||
          before.ownerId !== ownerId ||
          before.buttonCount !== room.buttonCount ||
          before.clickPrice !== room.clickPrice ||
          before.roundSeconds !== room.roundSeconds ||
          before.liveMinutes !== room.liveMinutes ||
          before.closesAt !== room.closesAt ||
          before.roundNumber !== room.roundNumber
        ) {
          await tx.$executeRawUnsafe(
            `INSERT INTO Room (id, slug, name, kind, ownerId, buttonCount, clickPrice, roundSeconds, createdAt, liveMinutes, closesAt, roundNumber)
             VALUES (${sqlStr(room.id)}, ${sqlStr(room.slug)}, ${sqlStr(room.name)}, ${sqlStr(room.kind)}, ${sqlStr(ownerId)}, ${sqlInt(room.buttonCount)}, ${sqlFloat(room.clickPrice)}, ${sqlInt(room.roundSeconds)}, ${sqlInt(room.createdAt)}, ${sqlInt(room.liveMinutes)}, ${sqlInt(room.closesAt)}, ${sqlInt(room.roundNumber)})
             ON CONFLICT(id) DO UPDATE SET
               slug=excluded.slug, name=excluded.name, kind=excluded.kind, ownerId=excluded.ownerId,
               buttonCount=excluded.buttonCount, clickPrice=excluded.clickPrice, roundSeconds=excluded.roundSeconds,
               createdAt=excluded.createdAt, liveMinutes=excluded.liveMinutes, closesAt=excluded.closesAt, roundNumber=excluded.roundNumber`,
          );
        }
        if (!before || !same(before.mutedIds ?? [], room.mutedIds ?? [])) {
          await tx.$executeRawUnsafe(
            `UPDATE Room SET mutedIds = '${JSON.stringify(room.mutedIds ?? []).replace(/'/g, "''")}' WHERE id = '${room.id.replace(/'/g, "''")}'`,
          );
        }
        if (
          !before ||
          before.paused !== room.paused ||
          before.pausedAt !== room.pausedAt ||
          before.slowMode !== room.slowMode
        ) {
          await tx.$executeRawUnsafe(
            `UPDATE Room SET paused = ${sqlInt(room.paused)}, pausedAt = ${sqlInt(room.pausedAt)}, slowMode = ${sqlInt(room.slowMode)} WHERE id = '${room.id.replace(/'/g, "''")}'`,
          );
        }
        if (!before || before.fogSeconds !== room.fogSeconds) {
          await tx
            .$executeRawUnsafe(
              `UPDATE Room SET fogSeconds = ${sqlInt(room.fogSeconds)} WHERE id = '${room.id.replace(/'/g, "''")}'`,
            )
            .catch(() => undefined);
        }

        if (!same(before?.round, room.round)) {
          if (!room.round) {
            await tx.round.deleteMany({ where: { roomId: room.id } });
          } else {
            const row = roundRow(room.id, room.round);
            await tx.$executeRawUnsafe(
              `INSERT INTO Round (id, roomId, number, status, startedAt, endsAt, revealUntil, clickPrice, buttonIds, totals, clicks, result)
               VALUES (${sqlStr(row.id)}, ${sqlStr(row.roomId)}, ${sqlInt(row.number)}, ${sqlStr(row.status)}, ${sqlInt(room.round.startedAt)}, ${sqlInt(room.round.endsAt)}, ${sqlInt(room.round.revealUntil)}, ${sqlFloat(row.clickPrice)}, ${sqlStr(row.buttonIds)}, ${sqlStr(row.totals)}, ${sqlStr(row.clicks)}, ${sqlStr(row.result)})
               ON CONFLICT(roomId) DO UPDATE SET
                 id=excluded.id, number=excluded.number, status=excluded.status, startedAt=excluded.startedAt,
                 endsAt=excluded.endsAt, revealUntil=excluded.revealUntil, clickPrice=excluded.clickPrice,
                 buttonIds=excluded.buttonIds, totals=excluded.totals, clicks=excluded.clicks, result=excluded.result`,
            );
            const fair = JSON.stringify({
              seedCommit: room.round.seedCommit ?? "",
              serverSeed: room.round.serverSeed ?? "",
              fairHash: room.round.fairHash ?? "",
            }).replace(/'/g, "''");
            await tx.$executeRawUnsafe(
              `UPDATE Round SET fair = '${fair}' WHERE id = '${room.round.id.replace(/'/g, "''")}'`,
            );
          }
        }

        if (!same(before?.playerIds, room.playerIds)) {
          await tx.roomSeat.deleteMany({ where: { roomId: room.id } });
          const seats = room.playerIds
            .filter((userId) => userIdSet.has(userId))
            .map((userId) => ({ roomId: room.id, userId }));
          if (seats.length) await tx.roomSeat.createMany({ data: seats });
        }

        const prevEventIds = new Set((before?.events ?? []).map((event) => event.id));
        const addedEvents = room.events.filter((event) => !prevEventIds.has(event.id));
        if (addedEvents.length) {
          const values = addedEvents
            .map(
              (event) =>
                `(${sqlStr(event.id)}, ${sqlStr(room.id)}, ${sqlStr(event.kind)}, ${sqlStr(event.userId)}, ${sqlStr(event.username)}, ${sqlStr(event.body)}, ${sqlInt(event.createdAt)})`,
            )
            .join(", ");
          await tx.$executeRawUnsafe(
            `INSERT OR IGNORE INTO RoomEvent (id, roomId, kind, userId, username, body, createdAt) VALUES ${values}`,
          );
        }
      }

      if (prev.roundNumber !== next.roundNumber || !same(prev.round, next.round)) {
        await tx.meta.upsert({
          where: { id: "app" },
          create: {
            id: "app",
            roundNumber: next.roundNumber,
            legacyRound: next.round ? JSON.stringify(next.round) : null,
          },
          update: {
            roundNumber: next.roundNumber,
            legacyRound: next.round ? JSON.stringify(next.round) : null,
          },
        });
      }
    },
    { timeout: 20_000 },
  );
  await flushSettledRounds();
}

async function writeStore(store: StoreData) {
  await persistStore(emptyStore(), store);
}

function scaleResultJson(raw: string | null) {
  if (!raw) return raw;
  try {
    const result = JSON.parse(raw) as {
      losingPot?: number;
      payoutPerWinningClick?: number;
      rake?: number;
      payouts?: { amount?: number }[];
    };
    if (!result || typeof result !== "object") return raw;
    if (typeof result.losingPot === "number") {
      result.losingPot = Math.round(result.losingPot * 100);
    }
    if (typeof result.payoutPerWinningClick === "number") {
      result.payoutPerWinningClick = Math.round(result.payoutPerWinningClick * 100);
    }
    if (typeof result.rake === "number") {
      result.rake = Math.round(result.rake * 100);
    }
    if (Array.isArray(result.payouts)) {
      for (const payout of result.payouts) {
        if (typeof payout.amount === "number") {
          payout.amount = Math.round(payout.amount * 100);
        }
      }
    }
    return JSON.stringify(result);
  } catch {
    return raw;
  }
}

async function migrateMoneyToCents() {
  await prisma.meta.upsert({
    where: { id: "money" },
    create: { id: "money", roundNumber: 0, legacyRound: "" },
    update: {},
  });
  const flag = await prisma.meta.findUnique({ where: { id: "money" } });
  if (flag?.legacyRound === "cents") return;

  const users = await prisma.user.count();
  if (users === 0) {
    await prisma.meta.update({
      where: { id: "money" },
      data: { legacyRound: "cents" },
    });
    return;
  }

  await prisma.$executeRawUnsafe("UPDATE User SET balance = ROUND(balance * 100)");
  await prisma.$executeRawUnsafe("UPDATE Tx SET amount = ROUND(amount * 100)");
  await prisma.$executeRawUnsafe("UPDATE Room SET clickPrice = ROUND(clickPrice * 100)");
  await prisma.$executeRawUnsafe("UPDATE Round SET clickPrice = ROUND(clickPrice * 100)");
  try {
    await prisma.$executeRawUnsafe("UPDATE ChainDeposit SET amount = ROUND(amount * 100)");
  } catch {
    /* table may not exist */
  }
  try {
    await prisma.$executeRawUnsafe("UPDATE Withdrawal SET amount = ROUND(amount * 100)");
  } catch {
    /* table may not exist */
  }

  const limitRows = await prisma.$queryRawUnsafe<{ id: string; limits: string | null }[]>(
    "SELECT id, limits FROM User",
  );
  for (const row of limitRows) {
    const limits = { ...emptyLimits(), ...parseJson(row.limits, emptyLimits()) };
    if (!limits.dailyLossCap) continue;
    limits.dailyLossCap = Math.round(limits.dailyLossCap * 100);
    await prisma.$executeRawUnsafe(
      `UPDATE User SET limits = '${JSON.stringify(limits).replace(/'/g, "''")}' WHERE id = '${row.id.replace(/'/g, "''")}'`,
    );
  }

  const roundRows = await prisma.$queryRawUnsafe<{ id: string; result: string | null }[]>(
    "SELECT id, result FROM Round",
  );
  for (const row of roundRows) {
    const next = scaleResultJson(row.result);
    if (!next || next === row.result) continue;
    await prisma.$executeRawUnsafe(
      `UPDATE Round SET result = '${next.replace(/'/g, "''")}' WHERE id = '${row.id.replace(/'/g, "''")}'`,
    );
  }

  const app = await prisma.meta.findUnique({ where: { id: "app" } });
  if (app?.legacyRound) {
    try {
      const round = JSON.parse(app.legacyRound) as {
        clickPrice?: number;
        result?: unknown;
      };
      if (typeof round.clickPrice === "number") {
        round.clickPrice = Math.round(round.clickPrice * 100);
      }
      if (round.result) {
        const scaled = scaleResultJson(JSON.stringify(round.result));
        if (scaled) round.result = JSON.parse(scaled);
      }
      await prisma.meta.update({
        where: { id: "app" },
        data: { legacyRound: JSON.stringify(round) },
      });
    } catch {
      /* leave legacy round as-is */
    }
  }

  await prisma.meta.update({
    where: { id: "money" },
    data: { legacyRound: "cents" },
  });
}

async function importJsonStore() {
  try {
    const raw = await readFile(JSON_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    const store: StoreData = {
      ...emptyStore(),
      ...parsed,
      users: parsed.users ?? {},
      sessions: parsed.sessions ?? {},
      oauthStates: parsed.oauthStates ?? {},
      notifications: parsed.notifications ?? [],
      rooms: parsed.rooms ?? {},
      txs: parsed.txs ?? [],
    };
    ensureRooms(store);
    for (const user of Object.values(store.users)) {
      user.limits ??= emptyLimits();
      user.ageConfirmedAt ??= null;
      user.resetToken ??= null;
      user.resetExpires ??= null;
      user.resetSentAt ??= null;
      user.inviteCode ??= "";
      user.invitedBy ??= null;
      user.headline ??= "";
      user.about ??= "";
      user.location ??= "";
    }
    for (const session of Object.values(store.sessions)) {
      session.createdAt ??= 0;
      session.userAgent ??= "";
    }
    await writeStore(store);
  } catch {
    const store = emptyStore();
    ensureRooms(store);
    for (const user of Object.values(store.users)) {
      user.limits ??= emptyLimits();
      user.ageConfirmedAt ??= null;
      user.resetToken ??= null;
      user.resetExpires ??= null;
      user.resetSentAt ??= null;
      user.inviteCode ??= "";
      user.invitedBy ??= null;
      user.headline ??= "";
      user.about ??= "";
      user.location ??= "";
    }
    for (const session of Object.values(store.sessions)) {
      session.createdAt ??= 0;
      session.userAgent ??= "";
    }
    await writeStore(store);
  }
}

let boot: Promise<void> | null = null;

async function ensureDb() {
  if (!boot) {
    boot = (async () => {
      await mkdir(path.join(process.cwd(), "data"), { recursive: true });
      await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
      await prisma.$queryRawUnsafe("PRAGMA foreign_keys=ON;");
      try {
        await prisma.$executeRawUnsafe(
          "ALTER TABLE Room ADD COLUMN mutedIds TEXT NOT NULL DEFAULT '[]'",
        );
      } catch {
        /* column already exists */
      }
      try {
        await prisma.$executeRawUnsafe(
          "ALTER TABLE Room ADD COLUMN paused INTEGER NOT NULL DEFAULT 0",
        );
      } catch {
        /* column already exists */
      }
      try {
        await prisma.$executeRawUnsafe("ALTER TABLE Room ADD COLUMN pausedAt INTEGER");
      } catch {
        /* column already exists */
      }
      try {
        await prisma.$executeRawUnsafe(
          "ALTER TABLE Room ADD COLUMN slowMode INTEGER NOT NULL DEFAULT 0",
        );
      } catch {
        /* column already exists */
      }
      try {
        await prisma.$executeRawUnsafe(
          "ALTER TABLE User ADD COLUMN limits TEXT NOT NULL DEFAULT '{}'",
        );
      } catch {
        /* column already exists */
      }
      try {
        await prisma.$executeRawUnsafe(
          "ALTER TABLE User ADD COLUMN auth TEXT NOT NULL DEFAULT '{}'",
        );
      } catch {
        /* column already exists */
      }
      try {
        await prisma.$executeRawUnsafe(
          "ALTER TABLE Session ADD COLUMN createdAt INTEGER NOT NULL DEFAULT 0",
        );
      } catch {
        /* column already exists */
      }
      try {
        await prisma.$executeRawUnsafe(
          "ALTER TABLE Session ADD COLUMN userAgent TEXT NOT NULL DEFAULT ''",
        );
      } catch {
        /* column already exists */
      }
      const rooms = await prisma.room.count();
      if (rooms === 0) await importJsonStore();
      const { ensureChainTables, startChainWatcher } = await import("@/lib/chain");
      const { ensureReportTables } = await import("@/lib/reports");
      const { ensureFriendTables } = await import("@/lib/friends");
      const { ensureSocialTables } = await import("@/lib/social");
      const { ensureStaffTables } = await import("@/lib/staff-auth");
      await ensureChainTables();
      await ensureFairTables();
      await ensureReportTables();
      await ensureFriendTables();
      await ensureSocialTables();
      await ensureStaffTables();
      await migrateMoneyToCents();
      await dropExpiredLogins();
      const { warmPlayLoss } = await import("@/lib/limits");
      const { warmInviteTotals } = await import("@/lib/referrals");
      await warmPlayLoss();
      await warmInviteTotals();
      const { startSitWindowWatcher } = await import("@/lib/sit-windows");
      startChainWatcher();
      startSitWindowWatcher();
    })().catch((error) => {
      boot = null;
      throw error;
    });
  }
  await boot;
}

/**
 * Sessions and OAuth states are only ever written, never cleared, so a year of
 * logins would be read at every boot for no one. An expired row cannot sign
 * anyone in, which is what makes dropping it safe.
 */
async function dropExpiredLogins() {
  const now = Date.now();
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM Session WHERE expiresAt < ${now}`);
    await prisma.$executeRawUnsafe(`DELETE FROM OAuthState WHERE expiresAt < ${now}`);
  } catch {
    /* nothing to clear */
  }
}

let liveStore: StoreData | null = null;

async function getLiveStore() {
  await ensureDb();
  if (!liveStore) liveStore = await readStore();
  return liveStore;
}

let queue: Promise<unknown> = Promise.resolve();

export function withStore<T>(fn: (store: StoreData) => T | Promise<T>) {
  const run = queue.then(async () => {
    const store = await getLiveStore();
    const prev = structuredClone(store) as StoreData;
    try {
      const result = await fn(store);
      await persistStore(prev, store);
      const slugs = new Set([...Object.keys(prev.rooms), ...Object.keys(store.rooms)]);
      for (const slug of slugs) {
        if (!same(prev.rooms[slug], store.rooms[slug])) {
          publishRoom(slug, !store.rooms[slug]);
        }
      }
      return result;
    } catch (error) {
      liveStore = prev;
      throw error;
    }
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run as Promise<T>;
}

export function withStoreRead<T>(fn: (store: StoreData) => T | Promise<T>) {
  const run = queue.then(async () => {
    const store = await getLiveStore();
    return fn(store);
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run as Promise<T>;
}
