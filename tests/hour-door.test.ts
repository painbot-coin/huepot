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
  tableClockMark,
  tableHourMood,
  takeSitWhen,
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
  assert.equal(classicHourSitLabel(waiting, soonAt), "Play Classic · starting soon");
  assert.equal(hourSendsToClassic(waiting, soonAt), true);
});

test("the live hour names the clock; midday only names the next one", () => {
  const liveAt = Date.UTC(2026, 8, 14, 20, 10, 0);
  assert.equal(classicHourSitLabel(live, liveAt), "Play Classic now");
  assert.equal(classicHourLine(live, liveAt).text, "Classic hour 20:00 UTC · on");

  const noon = Date.UTC(2026, 8, 14, 12, 0, 0);
  assert.equal(classicHourSitLabel(waiting, noon), "Play Classic");
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
  assert.equal(headerHourLabel(waiting, soonAt), "20:00 UTC soon");
  assert.equal(headerHourLabel(live, Date.UTC(2026, 8, 14, 20, 10, 0)), "20:00 UTC");
  assert.equal(showHeaderHour("/news", waiting, soonAt), true);
  assert.equal(showHeaderHour("/", waiting, soonAt), false);
  assert.equal(showHeaderHour("/rooms/classic", live, Date.UTC(2026, 8, 14, 20, 10, 0)), false);
  assert.equal(showHeaderHour("/network", waiting, Date.UTC(2026, 8, 14, 12, 0, 0)), false);
  assert.equal(headerHourHref(live, null, Date.UTC(2026, 8, 14, 20, 10, 0)), "/rooms/classic");
});

test("Classic names the clock, and Night or Fog only while that hour is on", () => {
  const noon = Date.UTC(2026, 8, 14, 12, 0, 0);
  const liveAt = Date.UTC(2026, 8, 14, 20, 10, 0);
  const night = { hour: 2, startAt: 0, endsAt: 1, live: false };
  const cup = { weekday: 0, hour: 21, startAt: 0, endsAt: 1, live: false };
  assert.equal(tableClockMark("classic", waiting, night, cup, noon), "next 20:00 UTC");
  assert.equal(tableHourMood("classic", live, night, cup, liveAt), "Classic hour 20:00 UTC.");
  assert.equal(tableClockMark("night", waiting, night, cup, noon), "");
  assert.equal(takeSitWhen("classic", waiting, { ...night, live: true }, { ...cup, live: true }), "");
  assert.equal(takeSitWhen("classic", live, night, cup), "Classic hour 20:00 UTC");
  assert.equal(
    takeSitWhen("fog", waiting, night, { ...cup, live: true }),
    "Fog cup Sun 21:00 UTC",
  );
});
