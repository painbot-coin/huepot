/**
 * One-shot: turn house gold Links into HouseButton. Not part of the live app.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";

function replaceChipLinks(src) {
  const re = /<Link\b[^>]*className="[^"]*chip-btn[^"]*"[^>]*>/g;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    out += src.slice(last, m.index);
    const open = m[0];
    const start = m.index + open.length;
    let i = start;
    let depth = 1;
    let done = false;
    while (i < src.length && !done) {
      const nextOpen = src.indexOf("<Link", i);
      const nextClose = src.indexOf("</Link>", i);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + 5;
        continue;
      }
      depth -= 1;
      if (depth === 0) {
        const inner = src.slice(start, nextClose);
        const ghost = /chip-btn-ghost/.test(open);
        const curly = open.match(/href=\{([^}]+)\}/);
        const quoted = open.match(/href="([^"]+)"/);
        const hrefAttr = curly ? `href={${curly[1]}}` : quoted ? `href="${quoted[1]}"` : "";
        const extra = (open.match(/className="chip-btn(?: chip-btn-ghost)?([^"]*)"/)?.[1] ?? "").trim();
        out += `<HouseButton${ghost ? " ghost" : ""}${extra ? ` className="${extra}"` : ""} ${hrefAttr}>${inner}</HouseButton>`;
        last = nextClose + 7;
        i = last;
        done = true;
        re.lastIndex = last;
      } else {
        i = nextClose + 7;
      }
    }
    if (!done) {
      out += open;
      last = start;
    }
  }
  out += src.slice(last);
  return out;
}

function ensureImport(src) {
  if (!src.includes("<HouseButton") || /import\s*\{[^}]*HouseButton/.test(src)) return src;
  if (src.includes('from "@/components/HouseUi"')) {
    return src.replace(
      /import\s*\{([^}]+)\}\s*from\s*"@\/components\/HouseUi"/,
      (all, names) =>
        names.includes("HouseButton")
          ? all
          : `import { ${names.trim().replace(/,$/, "")}, HouseButton } from "@/components/HouseUi"`,
    );
  }
  const line = 'import { HouseButton } from "@/components/HouseUi";\n';
  if (src.startsWith('"use client"')) {
    return src.replace(/^("use client";\r?\n)/, `$1${line}`);
  }
  return line + src;
}

for (const file of globSync("src/**/*.{tsx,ts}")) {
  const before = readFileSync(file, "utf8");
  if (!before.includes("chip-btn")) continue;
  const next = ensureImport(replaceChipLinks(before));
  if (next !== before) {
    writeFileSync(file, next);
    console.log("updated", file);
  }
}
