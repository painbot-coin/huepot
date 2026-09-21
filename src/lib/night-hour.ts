import { NIGHT_HOUR_UTC } from "@/lib/config";
import type { NightHour } from "@/lib/types";

export function nightHourUtc() {
  const raw = Number(process.env.NIGHT_HOUR_UTC ?? NIGHT_HOUR_UTC);
  if (!Number.isFinite(raw)) return NIGHT_HOUR_UTC;
  return Math.max(0, Math.min(23, Math.floor(raw)));
}

export function nightHourClock(hour: number) {
  return `${String(hour).padStart(2, "0")}:00 UTC`;
}

export function nightHourAt(now = Date.now(), hour = nightHourUtc()): NightHour {
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
