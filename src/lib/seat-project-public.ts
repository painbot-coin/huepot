/**
 * Public shape of a seat project. Safe to import from tests.
 */

import { priceLabel } from "@/lib/house-mark-list";
import type { HouseSeatId } from "@/lib/house-seats";

export type SeatProject = {
  id: string;
  userId: string;
  seat: HouseSeatId;
  name: string;
  how: string;
  href: string;
  priceCents: number;
  createdAt: number;
};

export type PublicProject = SeatProject & {
  username: string;
  owned: boolean;
  priceLabel: string;
};

export function parseProjectHref(raw: unknown) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) throw new Error("A project needs a door out.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("That door is not a link.");
  }
  if (url.protocol !== "https:") throw new Error("Doors out stay on https.");
  if (url.username || url.password) throw new Error("That door is not a link.");
  return url.toString();
}

export function publicProject(row: SeatProject, username: string, owned: string[]): PublicProject {
  const open = row.priceCents <= 0 || owned.includes(row.id);
  return {
    ...row,
    href: open ? row.href : "",
    username,
    owned: open,
    priceLabel: row.priceCents <= 0 ? "Free door" : `${priceLabel(row.priceCents)}`,
  };
}

export function canOpenProject(row: SeatProject, owned: string[]) {
  if (row.priceCents <= 0) return true;
  return owned.includes(row.id);
}
