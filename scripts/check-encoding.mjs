#!/usr/bin/env node
/**
 * Fails if any source file has been corrupted by a bad encoding round trip.
 *
 * This exists because it happened: ninety runs of text across sixteen files
 * were mangled by editing them through a shell that defaults to the system
 * codepage rather than UTF-8, so a middle dot became two characters and an
 * ellipsis became three. It was live and visible to players before anyone
 * noticed. The examples are described rather than written out, because a file
 * that checks for mangled text must not contain any.
 *
 * Two things are checked. A CP1252 artefact is a lead byte in the C2-C3 range
 * followed by something that only appears as the second half of a misread
 * UTF-8 pair. A byte-order mark is a stray three bytes before the first line
 * of a file that has no business starting with one.
 *
 * Usage: node scripts/check-encoding.mjs
 */

import { readFileSync, globSync } from "node:fs";

const ARTEFACT =
  /[\u00C2-\u00C3][\u0080-\u00BF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/;

const files = [
  ...globSync("src/**/*.{ts,tsx,css}"),
  ...globSync("scripts/**/*.{mjs,cjs,sh}"),
  ...globSync("prisma/**/*.prisma"),
  ...globSync("*.ts"),
];

const bad = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (text.startsWith("\uFEFF")) bad.push(`${file}: starts with a byte-order mark`);
  const hit = text.match(ARTEFACT);
  if (hit) {
    const line = text.slice(0, hit.index).split("\n").length;
    bad.push(`${file}:${line}: mangled text near "${text.slice(hit.index, hit.index + 12)}"`);
  }
  if (text.includes("\uFFFD")) bad.push(`${file}: holds a replacement character`);
}

if (bad.length) {
  console.error(`Encoding check failed on ${bad.length} file(s):`);
  for (const line of bad) console.error(`  ${line}`);
  console.error("");
  console.error("Fix: read and write these files as UTF-8. In PowerShell that means");
  console.error("Get-Content -Encoding UTF8, or [IO.File]::ReadAllText with a UTF8");
  console.error("encoding — the default is the system codepage, which mangles them.");
  process.exit(1);
}

console.log(`Encoding clean: ${files.length} files, no CP1252 artefacts and no byte-order marks.`);
