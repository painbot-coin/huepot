#!/usr/bin/env node
/**
 * Fails when a raw SQL statement gains an interpolation nobody has reviewed.
 *
 * The distinction that matters is which call is used:
 *
 *   prisma.$queryRaw`... ${x} ...`         a tagged template, so x becomes a
 *                                          bound parameter and is safe
 *                                          whatever it holds
 *   prisma.$queryRawUnsafe(`... ${x} ...`) a plain string, so x is pasted
 *                                          straight into the statement
 *
 * Only the second kind can be injected into. Within it, a value inside quotes
 * is protected by esc() / sqlStr() / an inline quote-doubling replace. A value
 * pasted bare has no quotes to break out of, so it must be a number, a UUID or
 * a literal the code chose itself — which cannot be proven by reading the text,
 * and so has to be reviewed by a person once and recorded.
 *
 * That record is scripts/sql-audit-baseline.json. Anything not in it fails,
 * which is the point: the existing statements were read line by line, and the
 * next one to appear should be read too rather than blending in.
 *
 * Usage: node scripts/sql-audit.mjs [--update]
 */

import { readFileSync, writeFileSync, globSync, existsSync } from "node:fs";

const BASELINE = "scripts/sql-audit-baseline.json";
const update = process.argv.includes("--update");

/** Escaping is written three ways in this codebase; all three count. */
function guarded(expr) {
  return (
    /\besc\(|\bsqlStr\(|\bsqlInt\(|\bsqlFloat\(/.test(expr) ||
    /\.replace\(\s*\/'\/g/.test(expr)
  );
}

/**
 * Walks a file and yields the text of each *Unsafe call, tracking parenthesis
 * depth so a statement ends where the call ends. Reading to the next backtick
 * instead used to run past the end and flag a RegExp two functions later.
 */
function unsafeCalls(text) {
  const out = [];
  const start = /\$(?:queryRaw|executeRaw)Unsafe\s*\(/g;
  let m;
  while ((m = start.exec(text))) {
    let depth = 1;
    let i = m.index + m[0].length;
    const from = i;
    while (i < text.length && depth > 0) {
      const ch = text[i];
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
      i += 1;
    }
    out.push({ body: text.slice(from, i - 1), offset: from });
  }
  return out;
}

const findings = [];
for (const file of globSync("src/**/*.ts")) {
  const text = readFileSync(file, "utf8");
  for (const call of unsafeCalls(text)) {
    for (const hit of call.body.matchAll(/\$\{([^}]+)\}/g)) {
      const expr = hit[1].trim();
      if (guarded(expr)) continue;
      const absolute = call.offset + hit.index;
      const line = text.slice(0, absolute).split("\n").length;
      const before = call.body.slice(0, hit.index);
      const quoted = /'$/.test(before);
      findings.push({
        file: file.replace(/\\/g, "/"),
        line,
        expr,
        quoted,
        key: `${file.replace(/\\/g, "/")} :: ${expr}`,
      });
    }
  }
}

if (update) {
  const baseline = {
    "//": "Bare interpolations in raw SQL that have been read and found to be numbers, UUIDs or literals the code chose itself. Adding an entry means someone checked it.",
    reviewed: [...new Set(findings.map((f) => f.key))].sort(),
  };
  writeFileSync(BASELINE, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  console.log(`Recorded ${baseline.reviewed.length} reviewed interpolation(s) in ${BASELINE}.`);
  process.exit(0);
}

const known = new Set(
  existsSync(BASELINE) ? (JSON.parse(readFileSync(BASELINE, "utf8")).reviewed ?? []) : [],
);
const fresh = findings.filter((f) => !known.has(f.key));

if (fresh.length) {
  console.error(`Raw SQL check failed: ${fresh.length} unreviewed interpolation(s).`);
  for (const f of fresh) {
    console.error(`  ${f.file}:${f.line}  \${${f.expr}}${f.quoted ? "  (inside quotes, unescaped)" : "  (bare)"}`);
  }
  console.error("");
  console.error("If the value is a string, wrap it: esc(x) or sqlStr(x). Better still,");
  console.error("use the tagged form — prisma.$queryRaw`… ${x} …` — which binds it.");
  console.error(`If it is genuinely a number or a literal, run with --update to record it.`);
  process.exit(1);
}

console.log(
  `Raw SQL clean: ${findings.length} bare interpolation(s), all previously reviewed; every other value is escaped or bound.`,
);
