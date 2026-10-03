/**
 * Copy the SQLite house and the JSON ledgers into MongoDB Atlas.
 * Prints counts only. Does not print the connection string.
 *
 *   node scripts/move-to-atlas.mjs --sqlite data/huepot.db --credentials atlas-credentials.env
 *   node scripts/move-to-atlas.mjs --sqlite data/huepot.db --credentials atlas-credentials.env --write-env .env
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { MongoClient } from "mongodb";

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function unquote(value) {
  const text = (value ?? "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function credentialUri(file) {
  const text = readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*MONGODB_URI\s*=\s*(.*)$/);
    if (match) return unquote(match[1]);
  }
  throw new Error("The credentials file has no MongoDB URI.");
}

function withDatabase(uri) {
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/[^/?]+)(\/[^?]*)?(\?.*)?$/i);
  if (!match) return uri;
  if (match[2] && match[2] !== "/") return uri;
  return `${match[1]}/huepot${match[3] || "?retryWrites=true&w=majority"}`;
}

function plain(value) {
  if (typeof value === "bigint") {
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : value.toString();
  }
  return value;
}

function docId(primary, row) {
  return primary.map((key) => (row[key] == null ? "" : String(row[key]))).join("\u001f");
}

const sqliteFile = path.resolve(arg("--sqlite") || path.join("data", "huepot.db"));
const credentials = path.resolve(arg("--credentials") || "atlas-credentials.env");
const writeEnv = arg("--write-env");
const uri = withDatabase(credentialUri(credentials));

const sqlite = new DatabaseSync(sqliteFile, { readOnly: true });
const read = (sql) => sqlite.prepare(sql).all();

const client = new MongoClient(uri);
await client.connect();
const db = client.db();

const tables = read(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'",
);
let users = 0;
let money = "";

for (const table of tables) {
  const name = table.name;
  const quoted = `"${name.replaceAll('"', '""')}"`;
  const pragma = read(`PRAGMA table_info(${quoted})`);
  const columns = pragma.map((column) => ({
    name: column.name,
    type: column.type || "TEXT",
    notNull: Number(column.notnull) === 1,
    defaultValue: column.dflt_value ?? null,
    pk: Number(column.pk) || 0,
  }));
  const primary = columns
    .filter((column) => column.pk > 0)
    .sort((a, b) => a.pk - b.pk)
    .map((column) => column.name);
  const indexes = read(`PRAGMA index_list(${quoted})`);
  const uniques = [];
  for (const index of indexes) {
    if (!Number(index.unique) || String(index.origin) === "pk") continue;
    const parts = read(`PRAGMA index_info("${String(index.name).replaceAll('"', '""')}")`);
    const group = parts.map((part) => part.name).filter(Boolean);
    if (group.length) uniques.push(group);
  }
  const rows = read(`SELECT * FROM ${quoted}`);
  await db.collection("__schema").replaceOne(
    { _id: name },
    { _id: name, columns, uniques },
    { upsert: true },
  );
  const collection = db.collection(name);
  if (rows.length) {
    const ops = rows.map((row) => {
      const next = {};
      for (const [key, value] of Object.entries(row)) next[key] = plain(value);
      const id = primary.length ? docId(primary, next) : String(next.id ?? "");
      return {
        replaceOne: {
          filter: { _id: id },
          replacement: { ...next, _id: id },
          upsert: true,
        },
      };
    });
    await collection.bulkWrite(ops, { ordered: false });
  }
  console.log(`${name} ${rows.length}`);
  if (name === "User") users = rows.length;
  if (name === "Meta") {
    const flag = rows.find((row) => row.id === "money");
    money = flag ? String(flag.legacyRound ?? "") : "";
  }
}

const dataDir = path.join(path.dirname(sqliteFile));
let jsonCount = 0;
for (const file of readdirSync(dataDir)) {
  if (!file.endsWith(".json")) continue;
  const value = JSON.parse(readFileSync(path.join(dataDir, file), "utf8"));
  await db.collection("JsonFile").replaceOne({ _id: file }, { _id: file, value }, { upsert: true });
  jsonCount += 1;
  console.log(`json ${file}`);
}

console.log(`users ${users}`);
console.log(`money ${money || "(none)"}`);
console.log(`json files ${jsonCount}`);

if (users > 0 && money !== "cents") {
  console.error("Refusing to switch: the money flag is not cents, so balances would be scaled.");
  sqlite.close();
  await client.close();
  process.exit(2);
}

if (writeEnv) {
  const envPath = path.resolve(writeEnv);
  let text = "";
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    text = "";
  }
  const line = `MONGODB_URI=${uri}`;
  const next = /(^|\n)MONGODB_URI=.*(\r?\n|$)/.test(text)
    ? text.replace(/(^|\n)MONGODB_URI=.*/ , `$1${line}`)
    : `${text.replace(/\s*$/, "")}\n${line}\n`;
  writeFileSync(envPath, next);
  console.log("wrote MONGODB_URI into the env file");
}

sqlite.close();
await client.close();
