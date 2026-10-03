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
  if (!hour) return "Play Classic";
  if (hour.live) return "Play Classic now";
  if (eventSoon(hour.startAt, now)) return "Play Classic · starting soon";
  return "Play Classic";
}

export function classicHourLine(hour: ClassicHour, now = Date.now()) {
  if (hour.live) {
    return { href: "/rooms/classic", text: `Classic hour ${clock(hour.hour)} · on`, soon: false };
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
  if (!hour) return "Play Night";
  if (hour.live) return "Play Night now";
  if (eventSoon(hour.startAt, now)) return "Play Night · starting soon";
  return "Play Night";
}

export function nightHourLine(hour: NightHour, now = Date.now()) {
  if (hour.live) {
    return { href: "/rooms/night", text: `Night hour ${clock(hour.hour)} · on`, soon: false };
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
    return { href: "/rooms/fog", text: `Fog cup ${fogClock(cup.weekday, cup.hour)} · on`, soon: false };
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
    const name = clock(hour.hour);
    return { href: "/rooms/classic", label: hour.live ? name : `${name} soon` };
  }
  if (hourSendsToNight(night, now) && night) {
    const name = clock(night.hour);
    return { href: "/rooms/night", label: night.live ? name : `${name} soon` };
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

/** The clock on a table. Night and Fog wear it only while that hour is on or about to start. */
export function tableClockMark(
  slug: string,
  hour?: ClassicHour | null,
  night?: NightHour | null,
  cup?: FogCup | null,
  now = Date.now(),
) {
  if (slug === "classic" && hour) {
    const name = clock(hour.hour);
    if (hour.live) return name;
    if (eventSoon(hour.startAt, now)) return `${name} soon`;
    return `next ${name}`;
  }
  if (slug === "night" && night && (night.live || eventSoon(night.startAt, now))) {
    const name = clock(night.hour);
    return night.live ? name : `${name} soon`;
  }
  if (slug === "fog" && cup && (cup.live || eventSoon(cup.startAt, now))) {
    const name = fogClock(cup.weekday, cup.hour);
    return cup.live ? name : `${name} soon`;
  }
  return "";
}

/** Mood line for a named hour. Empty when that hour is not changing the table. */
export function tableHourMood(
  slug: string,
  hour?: ClassicHour | null,
  night?: NightHour | null,
  cup?: FogCup | null,
  now = Date.now(),
) {
  const mark = tableClockMark(slug, hour, night, cup, now);
  if (!mark || mark.startsWith("next ")) return "";
  if (slug === "night") return `Night hour ${mark}.`;
  if (slug === "fog") return `Fog cup ${mark}.`;
  return `Classic hour ${mark}.`;
}

/** A take is stamped with a named hour only while that hour is on. */
export function takeSitWhen(
  slug: string,
  hour?: ClassicHour | null,
  night?: NightHour | null,
  cup?: FogCup | null,
) {
  if (slug === "night" && night?.live) return `Night hour ${clock(night.hour)}`;
  if (slug === "fog" && cup?.live) return `Fog cup ${fogClock(cup.weekday, cup.hour)}`;
  if (slug === "classic" && hour?.live) return `Classic hour ${clock(hour.hour)}`;
  return "";
}

export function headerHourHref(
  hour?: ClassicHour | null,
  night?: NightHour | null,
  now = Date.now(),
) {
  return namedHourDoor(hour, night, now)?.href ?? "/rooms/classic";
}
