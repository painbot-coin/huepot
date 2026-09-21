// Reports mojibake as escape codes only, so the report itself cannot be
// mangled by whatever shell renders it. Diagnostic; not part of the check.
import { globSync } from "node:fs";
import { readFileSync } from "node:fs";

// A UTF-8 lead byte misread as CP1252 becomes one of these. C2/C3 lead the
// two-byte characters (accented Latin); E2 leads the three-byte punctuation
// that actually shows up in prose -- em dash, curly quotes, ellipsis.
const LEADS = { "\u00C2": "C2", "\u00C3": "C3", "\u00E2": "E2" };
const TRAIL =
  "\u0080-\u00BF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178";
const PATTERN = new RegExp(`[\u00C2\u00C3\u00E2][${TRAIL}]+`, "g");

const files = [
  ...globSync("src/**/*.{ts,tsx,css}"),
  ...globSync("scripts/**/*.{mjs,cjs,sh}"),
  ...globSync("prisma/**/*.prisma"),
  ...globSync("*.{ts,md}"),
  ...globSync(".github/**/*.yml"),
];

const byLead = { C2: 0, C3: 0, E2: 0 };
const perFile = [];
let bomCount = 0;

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (text.startsWith("\uFEFF")) bomCount += 1;
  const hits = [...text.matchAll(PATTERN)];
  if (!hits.length) continue;
  const leads = {};
  let longest = 0;
  for (const hit of hits) {
    const lead = LEADS[hit[0][0]];
    byLead[lead] += 1;
    leads[lead] = (leads[lead] ?? 0) + 1;
    longest = Math.max(longest, hit[0].length);
  }
  perFile.push({ file, count: hits.length, leads, longest });
}

perFile.sort((a, b) => b.count - a.count);

console.log(`Files scanned: ${files.length}`);
console.log(`Byte-order marks: ${bomCount}`);
console.log("");
console.log("Mojibake runs by misread lead byte:");
console.log(`  C2 (2-byte, e.g. non-breaking space): ${byLead.C2}`);
console.log(`  C3 (2-byte, e.g. accented letters):   ${byLead.C3}`);
console.log(`  E2 (3-byte: em dash, quotes, ellipsis): ${byLead.E2}`);
console.log("");
console.log("Affected files, worst first:");
for (const row of perFile) {
  const leads = Object.entries(row.leads)
    .map(([k, v]) => `${k}:${v}`)
    .join(" ");
  console.log(
    `  ${row.file.padEnd(42)} ${String(row.count).padStart(5)} runs  ${leads.padEnd(16)} longest ${row.longest}`,
  );
}
if (!perFile.length) console.log("  none");
