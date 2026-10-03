/**
 * A person's book against the house book, on one sit.
 * The watch is the record. Neither book holds a wallet.
 */

import { agentBookById, deskPair, markById, sitParam } from "@/lib/house-mark-list";

export type BookSide = "person" | "house" | "even";

export function booksOnOneSit(raw: unknown) {
  const id = sitParam(typeof raw === "string" ? raw : "");
  const mark = id ? markById(id) : null;
  if (!mark) return null;
  const { west, east } = deskPair(mark.kind, id);
  if (!west || !east || west === east) return null;
  return { person: west, house: east, holdsWallet: false as const };
}

export function bookLabel(id: string) {
  return agentBookById(id)?.label || markById(id)?.name || id;
}

export function pairRecord(personScore: number, houseScore: number) {
  if (!Number.isFinite(personScore) || !Number.isFinite(houseScore)) return null;
  const lead: BookSide =
    personScore === houseScore ? "even" : personScore > houseScore ? "person" : "house";
  return { personScore, houseScore, lead, wallet: false as const };
}

export function pairLine(lead: BookSide) {
  if (lead === "even") return "The watch is even.";
  if (lead === "person") return "The seat's book leads the watch.";
  return "The house book leads the watch.";
}
