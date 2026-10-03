import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { atlasUri } from "@/lib/atlas-uri";

const memory = new Map<string, unknown>();
let writes: Promise<void> = Promise.resolve();

/**
 * A missing file is empty. A torn or unreadable file throws, so the next
 * save cannot replace a good ledger with a blank one.
 * When the house database is Atlas, the copy there is the one that is read.
 */
export function hasJsonMemory(name: string) {
  return memory.has(name);
}

export function takeJsonMemory(name: string, value: unknown) {
  memory.set(name, value);
}

export function readJsonFile<T>(file: string, parse: (raw: unknown) => T, empty: () => T): T {
  const name = path.basename(file);
  if (atlasUri() && memory.has(name)) return parse(memory.get(name));
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw error;
  }
  return parse(JSON.parse(text) as unknown);
}

function writeDisk(file: string, value: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value));
  try {
    renameSync(tmp, file);
  } catch {
    try {
      unlinkSync(file);
    } catch {
      /* the destination was already gone */
    }
    renameSync(tmp, file);
  }
}

export function jsonWritesDone() {
  return writes;
}

export function writeJsonFile(file: string, value: unknown) {
  if (!atlasUri()) {
    writeDisk(file, value);
    return;
  }
  const name = path.basename(file);
  memory.set(name, value);
  const pending = writes.catch(() => undefined).then(async () => {
    const { saveJsonDoc } = await import("@/lib/atlas-json");
    await saveJsonDoc(name, value);
    writeDisk(file, value);
  });
  writes = pending;
}
