/**
 * A circle for a craft or a language.
 * Listed only while a seat is in it. It does not hold the pot.
 */

import { seatOf, seatTag } from "@/lib/house-seats";
import { localeMeta, parseLocale } from "@/lib/locale";

export type CircleKind = "craft" | "tongue";

export type CircleSpec = {
  id: string;
  kind: CircleKind;
  key: string;
  label: string;
};

export type CircleRow = {
  id: string;
  members: string[];
};

const POT_SLUGS = new Set(["classic", "night", "fog"]);

/** The pot stays on Classic. A circle never holds one. */
export function holdsPot() {
  return false;
}

export function circleOf(raw: unknown): CircleSpec | null {
  const id = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!id || POT_SLUGS.has(id)) return null;
  if (id.startsWith("seat-")) {
    const key = seatOf(id.slice(5));
    if (!key) return null;
    return { id: `seat-${key}`, kind: "craft", key, label: seatTag(key) || key };
  }
  if (id.startsWith("lang-")) {
    const key = parseLocale(id.slice(5));
    if (!key) return null;
    return { id: `lang-${key}`, kind: "tongue", key, label: localeMeta(key).name };
  }
  return null;
}

export function seatsIn(members: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of members) {
    const id = raw.trim();
    if (!id || id === "house" || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

/** Rooms this seat is actually in. The house is not a member. */
export function circlesOf(rows: CircleRow[], userId: string) {
  const seat = userId.trim();
  if (!seat || seat === "house") return [];
  const open: { id: string; label: string }[] = [];
  for (const row of listedCircles(rows)) {
    if (!row.members.includes(seat)) continue;
    open.push({ id: row.id, label: row.label });
  }
  return open;
}

/** Empty rooms stay off the list. The house is not a person in the room. */
export function listedCircles(rows: CircleRow[]) {
  const open: (CircleSpec & { members: string[] })[] = [];
  for (const row of rows) {
    const spec = circleOf(row.id);
    if (!spec) continue;
    const members = seatsIn(row.members);
    if (members.length === 0) continue;
    open.push({ ...spec, members });
  }
  return open;
}

export function joinOn(rows: CircleRow[], id: string, userId: string) {
  const spec = circleOf(id);
  const seat = userId.trim();
  if (!spec) throw new Error("That room is not a craft or a language.");
  if (!seat || seat === "house") throw new Error("The house does not sit this room.");
  const next = rows.map((row) => ({ id: row.id, members: [...row.members] }));
  let row = next.find((item) => item.id === spec.id);
  if (!row) {
    row = { id: spec.id, members: [] };
    next.push(row);
  }
  if (!row.members.includes(seat)) row.members.push(seat);
  return { rows: next, circle: spec };
}

export function leaveOn(rows: CircleRow[], id: string, userId: string) {
  const spec = circleOf(id);
  if (!spec) throw new Error("That room is not open.");
  const seat = userId.trim();
  const next = rows
    .map((row) =>
      row.id === spec.id ? { id: row.id, members: row.members.filter((member) => member !== seat) } : row,
    )
    .filter((row) => seatsIn(row.members).length > 0);
  return { rows: next, circle: spec };
}
