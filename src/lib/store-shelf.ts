/**
 * Store shelves: house games, public models, and member projects.
 */

import { HOUSE_SEATS, isHouseSeatId, type HouseSeatId } from "@/lib/house-seats";
import type { MarkFilter, PublicMark } from "@/lib/house-mark-list";
import type { PublicProject } from "@/lib/seat-project-public";

export const STORE_SHELF_IDS = [
  "all",
  "house",
  "world",
  "game",
  "ai",
  "gamer",
  "better",
  "free",
  "vault",
] as const;

export type StoreShelf = (typeof STORE_SHELF_IDS)[number];

export const STORE_SHELVES: { id: StoreShelf; label: string }[] = [
  { id: "all", label: "All" },
  { id: "house", label: "Games" },
  { id: "world", label: "Models" },
  ...HOUSE_SEATS.map((row) => ({ id: row.id as StoreShelf, label: row.tag })),
  { id: "free", label: "Free" },
  { id: "vault", label: "Paid" },
];

export function parseStoreShelf(raw: unknown): StoreShelf {
  const id = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return (STORE_SHELF_IDS as readonly string[]).includes(id) ? (id as StoreShelf) : "all";
}

export function shelfShowsMarks(shelf: StoreShelf) {
  return shelf === "all" || shelf === "house" || shelf === "free" || shelf === "vault";
}

export function shelfShowsWorld(shelf: StoreShelf) {
  return shelf === "all" || shelf === "world";
}

export function shelfShowsProjects(shelf: StoreShelf) {
  return shelf === "all" || isHouseSeatId(shelf) || shelf === "free" || shelf === "vault";
}

export function markFilterFor(shelf: StoreShelf): MarkFilter {
  if (shelf === "free") return "free";
  if (shelf === "vault") return "vault";
  return "all";
}

export function filterShelfMarks(rows: PublicMark[], shelf: StoreShelf) {
  if (!shelfShowsMarks(shelf)) return [];
  if (shelf === "free") return rows.filter((row) => row.status === "live" && row.priceCents <= 0);
  if (shelf === "vault") return rows.filter((row) => row.status === "live" && row.priceCents > 0);
  return rows.filter((row) => row.status === "live");
}

export function filterShelfProjects(rows: PublicProject[], shelf: StoreShelf) {
  if (!shelfShowsProjects(shelf)) return [];
  if (isHouseSeatId(shelf)) return rows.filter((row) => row.seat === shelf);
  if (shelf === "free") return rows.filter((row) => row.priceCents <= 0);
  if (shelf === "vault") return rows.filter((row) => row.priceCents > 0);
  return rows;
}

export function projectSeatOf(shelf: StoreShelf): HouseSeatId | "" {
  return isHouseSeatId(shelf) ? shelf : "";
}
