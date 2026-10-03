import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { COPY, copyFor, type HouseCopy } from "@/lib/copy";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALES,
  parseLocale,
  pickFromAccept,
} from "@/lib/locale";

function keysOf(copy: HouseCopy) {
  return {
    nav: Object.keys(copy.nav).sort(),
    page: Object.keys(copy.page).sort(),
    cta: Object.keys(copy.cta).sort(),
    line: Object.keys(copy.line).sort(),
  };
}

test("the house keeps twelve world languages, not English only", () => {
  assert.equal(LOCALES.length, 12);
  assert.equal(DEFAULT_LOCALE, "en");
  assert.equal(isLocale("es"), true);
  assert.equal(isLocale("xx"), false);
  assert.equal(parseLocale("zh-CN"), "zh");
  assert.equal(parseLocale("pt-BR"), "pt");
  assert.equal(parseLocale("en-GB"), "en");
  assert.equal(parseLocale("nope"), null);
  assert.equal(pickFromAccept("es-MX,es;q=0.9,en;q=0.8"), "es");
  assert.equal(pickFromAccept("ja,en;q=0.4"), "ja");
  assert.equal(pickFromAccept(""), "en");
  const english = keysOf(copyFor("en"));
  for (const row of LOCALES) {
    assert.deepEqual(keysOf(COPY[row.id]), english, row.id);
  }
  assert.match(copyFor("es").cta.join, /Huepot/);
  assert.match(copyFor("zh").line.tagline, /同价|颜色/);
  assert.equal(LOCALES.find((row) => row.id === "ar")?.dir, "rtl");
});

test("the locale door only accepts a house language", () => {
  const route = readFileSync(new URL("../src/app/api/locale/route.ts", import.meta.url), "utf8");
  assert.match(route, /parseLocale/);
  assert.match(route, /LOCALE_COOKIE/);
  assert.doesNotMatch(route, /\$executeRawUnsafe/);
});
