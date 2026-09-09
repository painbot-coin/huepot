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
 * Pass --fix to repair rather than report. Byte-order marks are stripped, and
 * a mangled run is put back by mapping each character to the byte it was
 * misread from and decoding it as UTF-8 again — which is exact, where a
 * find-and-replace table would only cover the cases someone thought of.
 *
 * Usage: node scripts/check-encoding.mjs [--fix]
 */

import { readFileSync, writeFileSync, globSync } from "node:fs";

// CP1252 maps bytes 0x80-0x9F to characters rather than controls, which is why
// the corruption looks like punctuation instead of control codes.
const CP1252_BACK = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

const CONT =
  "\\u20AC\\u201A\\u0192\\u201E\\u2026\\u2020\\u2021\\u02C6\\u2030\\u0160" +
  "\\u2039\\u0152\\u017D\\u2018\\u2019\\u201C\\u201D\\u2022\\u2013\\u2014" +
  "\\u02DC\\u2122\\u0161\\u203A\\u0153\\u017E\\u0178\\u00A0-\\u00BF";
const RUN = new RegExp(`[\\u00C2-\\u00F4][${CONT}]{1,3}`, "g");

function unmangle(text) {
  let fixed = 0;
  const out = text.replace(RUN, (match) => {
    const bytes = [];
    for (const ch of match) {
      const cp = ch.codePointAt(0);
      const byte = CP1252_BACK.get(cp) ?? (cp <= 0xff ? cp : null);
      if (byte === null) return match;
      bytes.push(byte);
    }
    const decoded = Buffer.from(bytes).toString("utf8");
    if (decoded.includes("\uFFFD")) return match;
    fixed += 1;
    return decoded;
  });
  return { out, fixed };
}

const ARTEFACT =
  /[\u00C2-\u00C3][\u0080-\u00BF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/;

const files = [
  ...globSync("src/**/*.{ts,tsx,css}"),
  ...globSync("scripts/**/*.{mjs,cjs,sh}"),
  ...globSync("prisma/**/*.prisma"),
  ...globSync("*.ts"),
];

const fix = process.argv.includes("--fix");
const bad = [];
const repaired = [];

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  if (fix) {
    let next = text.startsWith("\uFEFF") ? text.slice(1) : text;
    const { out, fixed } = unmangle(next);
    next = out;
    if (next !== text) {
      writeFileSync(file, next, "utf8");
      const notes = [];
      if (text.startsWith("\uFEFF")) notes.push("byte-order mark");
      if (fixed) notes.push(`${fixed} mangled run${fixed === 1 ? "" : "s"}`);
      repaired.push(`${file}: ${notes.join(", ")}`);
    }
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

if (fix) {
  for (const line of repaired) console.log(`  fixed ${line}`);
  console.log(
    repaired.length
      ? `Repaired ${repaired.length} file(s). Run again without --fix to confirm.`
      : `Nothing to repair across ${files.length} files.`,
  );
  process.exit(0);
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
