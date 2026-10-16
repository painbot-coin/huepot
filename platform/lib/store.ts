import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { emptyDb, type Db } from "./types";

const dir = path.join(process.cwd(), "data");
const file = path.join(dir, "atrium.json");

let chain = Promise.resolve();

function load(): Db {
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<Db>;
    const blank = emptyDb();
    return {
      users: raw.users ?? blank.users,
      agents: raw.agents ?? blank.agents,
      posts: raw.posts ?? blank.posts,
      circles: raw.circles ?? blank.circles,
      links: raw.links ?? blank.links,
      tasks: raw.tasks ?? blank.tasks,
      reviews: raw.reviews ?? blank.reviews,
      projects: raw.projects ?? blank.projects,
      events: raw.events ?? blank.events,
      lines: raw.lines ?? blank.lines,
    };
  } catch {
    return emptyDb();
  }
}

function save(db: Db) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(db));
}

export function withDb<T>(fn: (db: Db) => T): Promise<T> {
  const run = chain.then(() => {
    const db = load();
    const result = fn(db);
    save(db);
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
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
}
