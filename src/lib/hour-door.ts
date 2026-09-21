/** Named hours are doors to a table, not a countdown on the lintel. */

import { eventSoon } from "@/lib/hall";
import { formatWait } from "@/lib/money";
import type { ClassicHour, FogCup, NightHour } from "@/lib/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fogClock(weekday: number, hour: number) {
  return `${DAYS[weekday] ?? "Sun"} ${String(hour).padStart(2, "0")}:00 UTC`;
}

function clock(hour: number) {
  return `${String(hour).padStart(2, "0")}:00 UTC`;
}

export function classicHourSitLabel(hour?: ClassicHour | null, now = Date.now()) {
  if (!hour) return "Sit Classic";
  if (hour.live) return "Sit Classic now";
  if (eventSoon(hour.startAt, now)) return "Sit Classic · hour soon";
  return "Sit Classic";
}

export function classicHourLine(hour: ClassicHour, now = Date.now()) {
  if (hour.live) {
    return { href: "/rooms/classic", text: "Classic hour is on · sit now", soon: false };
  }
  if (eventSoon(hour.startAt, now)) {
    return {
      href: "/rooms/classic",
      text: `Classic hour ${clock(hour.hour)} · soon`,
      soon: true,
    };
  }
  return {
    href: "/rooms/classic",
    text: `Next hour ${clock(hour.hour)} · in ${formatWait(hour.startAt - now)}`,
    soon: false,
  };
}

export function hourSendsToClassic(hour?: ClassicHour | null, now = Date.now()) {
  if (!hour) return false;
  return hour.live || eventSoon(hour.startAt, now);
}

export function nightHourSitLabel(hour?: NightHour | null, now = Date.now()) {
  if (!hour) return "Sit Night";
  if (hour.live) return "Sit Night now";
  if (eventSoon(hour.startAt, now)) return "Sit Night · hour soon";
  return "Sit Night";
}

export function nightHourLine(hour: NightHour, now = Date.now()) {
  if (hour.live) {
    return { href: "/rooms/night", text: "Night hour is on · sit now", soon: false };
  }
  if (eventSoon(hour.startAt, now)) {
    return {
      href: "/rooms/night",
      text: `Night hour ${clock(hour.hour)} · soon`,
      soon: true,
    };
  }
  return {
    href: "/rooms/night",
    text: `Next Night hour ${clock(hour.hour)} · in ${formatWait(hour.startAt - now)}`,
    soon: false,
  };
}

export function hourSendsToNight(hour?: NightHour | null, now = Date.now()) {
  if (!hour) return false;
  return hour.live || eventSoon(hour.startAt, now);
}

export function fogCupLine(cup: FogCup, now = Date.now()) {
  if (cup.live) {
    return { href: "/rooms/fog", text: "Fog cup is on · sit Fog", soon: false };
  }
  if (eventSoon(cup.startAt, now)) {
    return {
      href: "/rooms/fog",
      text: `Fog cup ${fogClock(cup.weekday, cup.hour)} · soon`,
      soon: true,
    };
  }
  return {
    href: "/rooms/fog",
    text: `Next Fog cup ${fogClock(cup.weekday, cup.hour)} · in ${formatWait(cup.startAt - now)}`,
    soon: false,
  };
}

export function cupSendsToFog(cup?: FogCup | null, now = Date.now()) {
  if (!cup) return false;
  return cup.live || eventSoon(cup.startAt, now);
}

export type NamedHourDoor = {
  href: "/rooms/classic" | "/rooms/night";
  label: string;
};

/** Live or soon Classic wins the lintel; Night takes it when Classic is quiet. */
export function namedHourDoor(
  hour?: ClassicHour | null,
  night?: NightHour | null,
  now = Date.now(),
): NamedHourDoor | null {
  if (hourSendsToClassic(hour, now) && hour) {
    return { href: "/rooms/classic", label: hour.live ? "Hour" : "Hour soon" };
  }
  if (hourSendsToNight(night, now) && night) {
    return { href: "/rooms/night", label: night.live ? "Hour" : "Hour soon" };
  }
  return null;
}

export function headerHourLabel(
  hour?: ClassicHour | null,
  now = Date.now(),
  night?: NightHour | null,
) {
  return namedHourDoor(hour, night, now)?.label ?? "";
}

export function showHeaderHour(
  path: string,
  hour?: ClassicHour | null,
  now = Date.now(),
  night?: NightHour | null,
) {
  const door = namedHourDoor(hour, night, now);
  if (!door) return false;
  if (path === "/" || path === "/signin") return false;
  if (path === door.href || path.startsWith(`${door.href}?`)) return false;
  return true;
}

export function headerHourHref(
  hour?: ClassicHour | null,
  night?: NightHour | null,
  now = Date.now(),
) {
  return namedHourDoor(hour, night, now)?.href ?? "/rooms/classic";
}
