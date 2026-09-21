/**
 * The named hour is a door to Classic, not a dead countdown.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  classicHourLine,
  classicHourSitLabel,
  cupSendsToFog,
  fogCupLine,
  headerHourHref,
  headerHourLabel,
  hourSendsToClassic,
  showHeaderHour,
} from "@/lib/hour-door";
import type { ClassicHour, FogCup } from "@/lib/types";

const start = Date.UTC(2026, 8, 14, 20, 0, 0);
const waiting: ClassicHour = {
  hour: 20,
  startAt: start,
  endsAt: start + 60 * 60 * 1000,
  live: false,
};
const live: ClassicHour = { ...waiting, live: true };

test("a countdown still opens Classic, and soon is a sit", () => {
  const soonAt = Date.UTC(2026, 8, 14, 19, 50, 0);
  const line = classicHourLine(waiting, soonAt);
  assert.equal(line.href, "/rooms/classic");
  assert.equal(line.soon, true);
  assert.equal(classicHourSitLabel(waiting, soonAt), "Sit Classic · hour soon");
  assert.equal(hourSendsToClassic(waiting, soonAt), true);
});

test("the live hour says sit now; midday only names the next one", () => {
  const liveAt = Date.UTC(2026, 8, 14, 20, 10, 0);
  assert.equal(classicHourSitLabel(live, liveAt), "Sit Classic now");
  assert.equal(classicHourLine(live, liveAt).text.includes("sit now"), true);

  const noon = Date.UTC(2026, 8, 14, 12, 0, 0);
  assert.equal(classicHourSitLabel(waiting, noon), "Sit Classic");
  assert.equal(hourSendsToClassic(waiting, noon), false);
  assert.equal(classicHourLine(waiting, noon).href, "/rooms/classic");
});

test("a Fog cup countdown still opens Fog", () => {
  const startAt = Date.UTC(2026, 8, 20, 21, 0, 0);
  const cup: FogCup = {
    weekday: 0,
    hour: 21,
    startAt,
    endsAt: startAt + 60 * 60 * 1000,
    live: false,
  };
  const soonAt = Date.UTC(2026, 8, 20, 20, 50, 0);
  const line = fogCupLine(cup, soonAt);
  assert.equal(line.href, "/rooms/fog");
  assert.equal(line.soon, true);
  assert.equal(cupSendsToFog(cup, soonAt), true);
  assert.equal(fogCupLine(cup, Date.UTC(2026, 8, 14, 12, 0, 0)).href, "/rooms/fog");
});

test("the lintel names the hour off the hall, not on Classic", () => {
  const soonAt = Date.UTC(2026, 8, 14, 19, 50, 0);
  assert.equal(headerHourLabel(waiting, soonAt), "Hour soon");
  assert.equal(headerHourLabel(live, Date.UTC(2026, 8, 14, 20, 10, 0)), "Hour");
  assert.equal(showHeaderHour("/news", waiting, soonAt), true);
  assert.equal(showHeaderHour("/", waiting, soonAt), false);
  assert.equal(showHeaderHour("/rooms/classic", live, Date.UTC(2026, 8, 14, 20, 10, 0)), false);
  assert.equal(showHeaderHour("/network", waiting, Date.UTC(2026, 8, 14, 12, 0, 0)), false);
  assert.equal(headerHourHref(live, null, Date.UTC(2026, 8, 14, 20, 10, 0)), "/rooms/classic");
});
