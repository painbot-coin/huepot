#!/usr/bin/env node
/**
 * A snapshot of the money database that is worth restoring.
 *
 * Not `cp`. The database runs in WAL mode, so the .db file on its own is
 * missing whatever is still sitting in the -wal — at the time this was written
 * that was four megabytes of committed writes. Copying the three files is no
 * better, because cp is not atomic against a live writer and a torn copy looks
 * fine until the day you need it. `VACUUM INTO` asks SQLite itself for a
 * consistent copy of a running database, which is the only cheap way to get one.
 *
 * Every snapshot is opened and checked before it is kept. A backup nobody has
 * read is a guess, and this is the file that holds who is owed money.
 *
 * Usage: node scripts/backup.cjs [--keep N] [--dir /path]
 */

const { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, appendFileSync } = require("node:fs");
const { createGzip } = require("node:zlib");
const { pipeline } = require("node:stream/promises");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const KEEP = Number(argOf("--keep", "14"));
const OUT_DIR = argOf("--dir", "/root/huepot-backup/snapshots");
const LOG = path.join(OUT_DIR, "backup.log");

function sourcePath() {
  const url = process.env.DATABASE_URL || "";
  const file = url.replace(/^file:/, "");
  if (!file) return "/var/www/huepot/data/huepot.db";
  return path.resolve("/var/www/huepot/prisma", file);
}

function stamp(at = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${at.getUTCFullYear()}${p(at.getUTCMonth() + 1)}${p(at.getUTCDate())}-${p(at.getUTCHours())}${p(at.getUTCMinutes())}${p(at.getUTCSeconds())}`;
}

function note(line) {
  const stampedLine = `${new Date().toISOString()} ${line}`;
  console.log(stampedLine);
  try {
    appendFileSync(LOG, `${stampedLine}\n`);
  } catch {
    // The log is a convenience; failing to write it must not fail the backup.
  }
}

async function countsFrom(client) {
  const one = async (table) => {
    const rows = await client.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM "${table}"`);
    return Number(rows[0].n);
  };
  return {
    users: await one("User"),
    txs: await one("Tx"),
    balance: Number(
      (await client.$queryRawUnsafe("SELECT COALESCE(SUM(balance),0) AS n FROM User"))[0].n,
    ),
  };
}

async function main() {
  const src = sourcePath();
  if (!existsSync(src)) throw new Error(`no database at ${src}`);
  mkdirSync(OUT_DIR, { recursive: true });

  const raw = path.join(OUT_DIR, `huepot-${stamp()}.db`);
  if (existsSync(raw)) throw new Error(`${raw} already exists`);

  const live = new PrismaClient({ datasources: { db: { url: `file:${src}` } } });
  let before;
  try {
    before = await countsFrom(live);
    // Single quotes doubled: the path is ours, but this is still SQL.
    await live.$executeRawUnsafe(`VACUUM INTO '${raw.replace(/'/g, "''")}'`);
  } finally {
    await live.$disconnect();
  }

  // Read it back as its own database. This is the step that turns a file into
  // a backup: structure verified, and the rows that matter actually present.
  const copy = new PrismaClient({ datasources: { db: { url: `file:${raw}` } } });
  let after;
  try {
    const [{ integrity_check: verdict }] = await copy.$queryRawUnsafe("PRAGMA integrity_check");
    if (verdict !== "ok") throw new Error(`integrity_check said "${verdict}"`);
    after = await countsFrom(copy);
  } finally {
    await copy.$disconnect();
  }

  if (after.users < before.users || after.txs < before.txs) {
    throw new Error(
      `snapshot is behind the source (users ${after.users}/${before.users}, txs ${after.txs}/${before.txs})`,
    );
  }
  if (after.users === 0) throw new Error("snapshot has no accounts in it");

  const gz = `${raw}.gz`;
  await pipeline(createReadStream(raw), createGzip({ level: 9 }), createWriteStream(gz));
  unlinkSync(raw);

  const size = statSync(gz).size;
  note(
    `ok ${path.basename(gz)} ${(size / 1024 / 1024).toFixed(1)}MB · ${after.users} accounts, ${after.txs} money rows, ${(after.balance / 100).toFixed(2)} USDT held`,
  );

  const kept = readdirSync(OUT_DIR)
    .filter((name) => /^huepot-\d{8}-\d{6}\.db\.gz$/.test(name))
    .sort()
    .reverse();
  for (const stale of kept.slice(KEEP)) {
    unlinkSync(path.join(OUT_DIR, stale));
    note(`pruned ${stale}`);
  }
}

main().catch((error) => {
  note(`FAILED ${error.message}`);
  process.exit(1);
});
