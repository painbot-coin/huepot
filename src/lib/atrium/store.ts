import path from "node:path";
import { sealStored } from "@/lib/atrium/key";
import { settlePacts } from "@/lib/atrium/pact";
import { primeJsonFromAtlas } from "@/lib/atlas-json";
import { jsonWritesDone, readJsonFile, writeJsonFile } from "@/lib/durable-json";
import { emptyDb, type Db, type User } from "@/lib/atrium/types";

const dir = path.join(process.cwd(), "data");
const file = path.join(dir, "atrium.json");

let chain = Promise.resolve();

function parseDb(raw: unknown): Db {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Practice ledger could not be read.");
  }
  const row = raw as Partial<Db>;
  const blank = emptyDb();
  return {
    users: row.users ?? blank.users,
    agents: row.agents ?? blank.agents,
    posts: row.posts ?? blank.posts,
    circles: row.circles ?? blank.circles,
    links: row.links ?? blank.links,
    tasks: row.tasks ?? blank.tasks,
    reviews: row.reviews ?? blank.reviews,
    projects: row.projects ?? blank.projects,
    events: row.events ?? blank.events,
    lines: row.lines ?? blank.lines,
    pacts: row.pacts ?? blank.pacts,
  };
}

function load(): Db {
  return readJsonFile(file, parseDb, emptyDb);
}

function save(db: Db) {
  writeJsonFile(file, db);
}

async function ready() {
  await primeJsonFromAtlas();
  await jsonWritesDone();
}

export async function readReady() {
  await ready();
  return load();
}

export function withDb<T>(fn: (db: Db) => T): Promise<T> {
  const run = chain.then(async () => {
    await ready();
    const db = load();
    const result = fn(db);
    save(db);
    await ready();
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function readSettled(at = Date.now()) {
  return withDb((db) => {
    const next = settlePacts(db, at);
    commit(db, next);
    return next;
  });
}

export function readDb() {
  return load();
}

export function commit(db: Db, next: Db) {
  db.users = next.users;
  db.agents = next.agents;
  db.posts = next.posts;
  db.circles = next.circles;
  db.links = next.links;
  db.tasks = next.tasks;
  db.reviews = next.reviews;
  db.projects = next.projects;
  db.events = next.events;
  db.lines = next.lines;
  db.pacts = next.pacts;
}

/** A Huepot seat, the first time it opens Agents. Practice balance starts at zero. */
export function ensureSeat(db: Db, person: { id: string; username: string }): User {
  let row = db.users.find((item) => item.id === person.id);
  if (!row) {
    row = {
      id: person.id,
      username: person.username,
      name: person.username,
      passwordHash: "",
      kind: "human",
      claims: { human: true, over18: true, showName: true },
      balance: 0,
      apiKey: "",
      createdAt: Date.now(),
    };
    db.users.push(row);
  } else {
    if (row.apiKey) row.apiKey = sealStored(row.apiKey);
    if (row.username !== person.username) row.username = person.username;
  }
  return row;
}

export function seatByUsername(db: Db, raw: string) {
  const name = raw.trim().toLowerCase();
  if (!name) return null;
  return db.users.find((row) => row.username.toLowerCase() === name) ?? null;
}
