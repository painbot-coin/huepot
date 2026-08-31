import { CLASSIC_HOUR_UTC } from "./config";
import type { ClassicHour } from "./types";

export function classicHourUtc() {
  const raw = Number(process.env.CLASSIC_HOUR_UTC ?? CLASSIC_HOUR_UTC);
  if (!Number.isFinite(raw)) return CLASSIC_HOUR_UTC;
  return Math.max(0, Math.min(23, Math.floor(raw)));
}

export function classicHourClock(hour: number) {
  return `${String(hour).padStart(2, "0")}:00 UTC`;
}

export function classicHourAt(now = Date.now(), hour = classicHourUtc()): ClassicHour {
  const day = new Date(now);
  const start = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    hour,
    0,
    0,
    0,
  );
  const length = 60 * 60 * 1000;
  if (now < start) {
    return { hour, startAt: start, endsAt: start + length, live: false };
  }
  if (now < start + length) {
    return { hour, startAt: start, endsAt: start + length, live: true };
  }
  const next = start + 24 * 60 * 60 * 1000;
  return { hour, startAt: next, endsAt: next + length, live: false };
}
