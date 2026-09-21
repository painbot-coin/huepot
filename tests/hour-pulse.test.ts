/**
 * Classic hour pulls company, not only last week's clickers.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  classicHourNoticeBody,
  classicHourNoticeTitle,
  fogCupNoticeBody,
  hourAudience,
  nightHourNoticeBody,
  nightHourNoticeTitle,
} from "@/lib/hour-pulse";

const company = new Map<string, string[]>([
  ["danny", ["bill", "house", "danny", "blocked"]],
  ["bill", ["danny"]],
]);
const blocked = new Map<string, string[]>([["danny", ["blocked"]]]);

function companyOf(id: string) {
  return company.get(id) ?? [];
}

function blockedOf(id: string) {
  return blocked.get(id) ?? [];
}

test("the hour still names Classic and asks company to sit", () => {
  assert.equal(classicHourNoticeTitle(), "Classic hour is on");
  assert.equal(classicHourNoticeBody(), "Sit Classic with company. The named hour just opened.");
  assert.equal(fogCupNoticeBody("Sun 21:00 UTC"), "Sit Fog with company. Sun 21:00 UTC.");
  assert.equal(nightHourNoticeTitle(), "Night hour is on");
  assert.equal(nightHourNoticeBody(), "Sit Night with company. The named hour just opened.");
});

test("a sitter's company hears the hour; a block and the house do not", () => {
  const ids = hourAudience(["danny", "house"], companyOf, blockedOf);
  assert.ok(ids.includes("danny"));
  assert.ok(ids.includes("bill"));
  assert.equal(ids.includes("house"), false);
  assert.equal(ids.includes("blocked"), false);
});

test("someone who never sat still hears it when company sat", () => {
  const ids = hourAudience(["danny"], companyOf, blockedOf);
  assert.ok(ids.includes("bill"));
});

test("a lone sitter with no company still hears the hour", () => {
  assert.deepEqual(hourAudience(["solo"], companyOf, blockedOf), ["solo"]);
});
