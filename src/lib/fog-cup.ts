import { FOG_CUP_HOUR_UTC, FOG_CUP_WEEKDAY } from "./config";
import type { FogCup } from "./types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function fogCupWeekday() {
  const raw = Number(process.env.FOG_CUP_WEEKDAY ?? FOG_CUP_WEEKDAY);
  if (!Number.isFinite(raw)) return FOG_CUP_WEEKDAY;
  return Math.max(0, Math.min(6, Math.floor(raw)));
}

export function fogCupHourUtc() {
  const raw = Number(process.env.FOG_CUP_HOUR_UTC ?? FOG_CUP_HOUR_UTC);
  if (!Number.isFinite(raw)) return FOG_CUP_HOUR_UTC;
  return Math.max(0, Math.min(23, Math.floor(raw)));
}

export function fogCupClock(weekday: number, hour: number) {
  const day = DAYS[weekday] ?? DAYS[FOG_CUP_WEEKDAY];
  return `${day} ${String(hour).padStart(2, "0")}:00 UTC`;
}

export function fogCupAt(
  now = Date.now(),
  weekday = fogCupWeekday(),
  hour = fogCupHourUtc(),
): FogCup {
  const day = new Date(now);
  const delta = weekday - day.getUTCDay();
  const start = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate() + delta,
    hour,
    0,
    0,
    0,
  );
  const length = 60 * 60 * 1000;
  if (now < start) {
    return { weekday, hour, startAt: start, endsAt: start + length, live: false };
  }
  if (now < start + length) {
    return { weekday, hour, startAt: start, endsAt: start + length, live: true };
  }
  const next = start + 7 * 24 * 60 * 60 * 1000;
  return { weekday, hour, startAt: next, endsAt: next + length, live: false };
}
