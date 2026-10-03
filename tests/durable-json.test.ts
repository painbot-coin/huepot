import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readJsonFile, writeJsonFile } from "@/lib/durable-json";

test("a missing file starts empty and a torn file is refused", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "huepot-json-"));
  const file = path.join(dir, "book.json");
  const empty = readJsonFile(file, (raw) => raw, () => ({ ok: false }));
  assert.deepEqual(empty, { ok: false });
  writeJsonFile(file, { ok: true, rows: [1] });
  assert.equal(JSON.parse(readFileSync(file, "utf8")).ok, true);
  writeFileSync(file, "{");
  assert.throws(() => readJsonFile(file, (raw) => raw, () => ({ ok: false })));
  rmSync(dir, { recursive: true, force: true });
});
