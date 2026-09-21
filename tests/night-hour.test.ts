/**
 * Night hour is a door to Night Pit, same shape as Classic hour.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { nightHourAt, nightHourClock } from "@/lib/night-hour";
import {
  headerHourHref,
  hourSendsToNight,
  nightHourLine,
  nightHourSitLabel,
  showHeaderHour,
} from "@/lib/hour-door";
import type { ClassicHour, NightHour } from "@/lib/types";

const start = Date.UTC(2026, 8, 14, 22, 0, 0);
const waiting: NightHour = {
  hour: 22,
  startAt: start,
  endsAt: start + 60 * 60 * 1000,
  live: false,
};
const live: NightHour = { ...waiting, live: true };

test("Night names 22:00 UTC and sits that table", () => {
  assert.equal(nightHourClock(22), "22:00 UTC");
  const at = Date.UTC(2026, 8, 14, 21, 50, 0);
  assert.equal(nightHourSitLabel(waiting, at), "Sit Night · hour soon");
  assert.equal(nightHourLine(waiting, at).href, "/rooms/night");
  assert.equal(hourSendsToNight(waiting, at), true);
  assert.equal(nightHourAt(at, 22).live, false);
  assert.equal(nightHourAt(Date.UTC(2026, 8, 14, 22, 10, 0), 22).live, true);
});

test("the lintel sends Night when Classic is quiet", () => {
  const classic: ClassicHour = {
    hour: 20,
    startAt: Date.UTC(2026, 8, 15, 20, 0, 0),
    endsAt: Date.UTC(2026, 8, 15, 21, 0, 0),
    live: false,
  };
  const soonAt = Date.UTC(2026, 8, 14, 21, 50, 0);
  assert.equal(headerHourHref(classic, waiting, soonAt), "/rooms/night");
  assert.equal(showHeaderHour("/news", classic, soonAt, waiting), true);
  assert.equal(showHeaderHour("/rooms/night", classic, soonAt, waiting), false);
  assert.equal(showHeaderHour("/news", classic, soonAt, live), true);
  assert.equal(nightHourSitLabel(live, Date.UTC(2026, 8, 14, 22, 10, 0)), "Sit Night now");
});
