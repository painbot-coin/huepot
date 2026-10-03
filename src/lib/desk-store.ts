import path from "node:path";
import { primeJsonFromAtlas } from "@/lib/atlas-json";
import { jsonWritesDone, readJsonFile, writeJsonFile } from "@/lib/durable-json";

export type DeskCompany = {
  id: string;
  founderId: string;
  name: string;
  brief: string;
  memberIds: string[];
  createdAt: number;
};

export type DeskOpening = {
  id: string;
  companyId: string;
  role: string;
  title: string;
  brief: string;
  open: boolean;
  createdAt: number;
};

export type DeskApplication = {
  id: string;
  openingId: string;
  userId: string;
  username: string;
  note: string;
  createdAt: number;
};

export type DeskDb = {
  companies: DeskCompany[];
  openings: DeskOpening[];
  applications: DeskApplication[];
};

const dir = path.join(process.cwd(), "data");
const file = path.join(dir, "desks.json");

let chain = Promise.resolve();

function empty(): DeskDb {
  return { companies: [], openings: [], applications: [] };
}

function parseDesks(raw: unknown): DeskDb {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Companies could not be read.");
  }
  const row = raw as Partial<DeskDb>;
  return {
    companies: row.companies ?? [],
    openings: row.openings ?? [],
    applications: row.applications ?? [],
  };
}

function load(): DeskDb {
  return readJsonFile(file, parseDesks, empty);
}

function save(db: DeskDb) {
  writeJsonFile(file, db);
}

export function withDesks<T>(fn: (db: DeskDb) => T): Promise<T> {
  const run = chain.then(async () => {
    await primeJsonFromAtlas();
    await jsonWritesDone();
    const db = load();
    const result = fn(db);
    save(db);
    await jsonWritesDone();
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function readDesks() {
  return load();
}
