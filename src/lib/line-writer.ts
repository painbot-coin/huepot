/**
 * A public line names who wrote it.
 * A seat is a person. The house is the house. A book is a book.
 * A book does not post as a seat. A letter is not a line.
 */

import { houseCardKind } from "@/lib/take-talk";

export const LINE_WRITERS = ["seat", "house", "book"] as const;
export type LineWriter = (typeof LINE_WRITERS)[number];

function isHouseName(input: { userId?: string; username?: string }) {
  const id = (input.userId ?? "").trim().toLowerCase();
  const name = (input.username ?? "").trim().toLowerCase();
  return id === "house" || name === "house";
}

export function lineWriterOf(input: {
  userId?: string;
  username?: string;
  link?: string;
}): LineWriter {
  if (houseCardKind(input.link ?? "")) return "house";
  if (isHouseName(input)) return "house";
  return "seat";
}

/** A book speaks under its own name. Never under a seat. */
export function bookLine(name: string) {
  const label = name.trim();
  return label ? `A book · ${label}` : "A book";
}

export function writerLabel(writer: LineWriter, name = "") {
  if (writer === "house") return "The house";
  if (writer === "book") return bookLine(name);
  const seat = name.trim();
  return seat ? `A seat · @${seat}` : "A seat";
}

export function bookPostsAsSeat() {
  return false;
}
