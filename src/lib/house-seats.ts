/**
 * Who uses Huepot. Four crafts, and a plain seat for anyone else.
 */

export const HOUSE_SEAT_IDS = ["game", "ai", "gamer", "better", "here"] as const;
export type HouseSeatId = (typeof HOUSE_SEAT_IDS)[number];

export const HOUSE_SEATS: {
  id: HouseSeatId;
  label: string;
  who: string;
  tag: string;
}[] = [
  { id: "game", label: "Game developer", who: "Ships a game or a tool.", tag: "Game" },
  { id: "ai", label: "AI developer", who: "Trains a model.", tag: "AI" },
  { id: "gamer", label: "Gamer", who: "Plays the games.", tag: "Play" },
  { id: "better", label: "Bettor", who: "Plays the tables.", tag: "Table" },
  { id: "here", label: "Here", who: "A seat. No craft required.", tag: "Here" },
];

export function isHouseSeatId(value: string): value is HouseSeatId {
  return (HOUSE_SEAT_IDS as readonly string[]).includes(value);
}

export function parseHouseSeat(raw: unknown): HouseSeatId | "" {
  const id = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!id) return "";
  if (!isHouseSeatId(id)) throw new Error("Pick a role.");
  return id;
}

export function seatOf(value?: string | null): HouseSeatId | "" {
  const id = (value ?? "").trim().toLowerCase();
  return isHouseSeatId(id) ? id : "";
}

export function seatLabel(value?: string | null) {
  const id = seatOf(value);
  return HOUSE_SEATS.find((row) => row.id === id)?.label ?? "";
}

export function seatTag(value?: string | null) {
  const id = seatOf(value);
  return HOUSE_SEATS.find((row) => row.id === id)?.tag ?? "";
}

export function seatHeadline(value?: string | null) {
  return seatLabel(value) || "Huepot player";
}

export function seatWho(value?: string | null) {
  const id = seatOf(value);
  return HOUSE_SEATS.find((row) => row.id === id)?.who ?? "";
}
