import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { StoreData, User } from "./types";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

const emptyStore = (): StoreData => ({
  users: {},
  sessions: {},
  oauthStates: {},
  notifications: [],
  round: null,
  roundNumber: 0,
  txs: [],
});

function normalizeUser(user: User): User {
  return {
    ...user,
    googleId: user.googleId ?? null,
    emailVerified: user.emailVerified ?? false,
    verifyToken: user.verifyToken ?? null,
    verifyExpires: user.verifyExpires ?? null,
    verifySentAt: user.verifySentAt ?? null,
    passwordHash: user.passwordHash ?? "",
    wallets: user.wallets ?? {},
  };
}

function normalize(raw: Partial<StoreData> | null): StoreData {
  const base = emptyStore();
  if (!raw || typeof raw !== "object") return base;
  const users: Record<string, User> = {};
  for (const [id, user] of Object.entries(raw.users ?? {})) {
    users[id] = normalizeUser(user);
  }
  return {
    users,
    sessions: raw.sessions ?? {},
    oauthStates: raw.oauthStates ?? {},
    notifications: raw.notifications ?? [],
    round: raw.round ?? null,
    roundNumber: raw.roundNumber ?? 0,
    txs: raw.txs ?? [],
  };
}

let queue: Promise<unknown> = Promise.resolve();

async function readStore(): Promise<StoreData> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    return normalize(JSON.parse(raw) as Partial<StoreData>);
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: StoreData) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function withStore<T>(fn: (store: StoreData) => T | Promise<T>) {
  const run = queue.then(async () => {
    const store = await readStore();
    const result = await fn(store);
    await writeStore(store);
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run as Promise<T>;
}

export function withStoreRead<T>(fn: (store: StoreData) => T | Promise<T>) {
  const run = queue.then(async () => {
    const store = await readStore();
    return fn(store);
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run as Promise<T>;
}
