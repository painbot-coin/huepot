import { formatUsdt } from "@/lib/money";
import type { PublicTake } from "@/lib/types";

const SIT_DOORS: Record<string, string> = {
  classic: "Classic",
  lightning: "Lightning",
  duo: "Duo",
  high: "High",
  fog: "Fog",
  night: "Night",
  wheel: "Wheel",
  dice: "Dice",
};

export function sitDoorLabel(slug: string, roomName: string) {
  const door = SIT_DOORS[slug];
  return door ? `Sit ${door}` : `Sit ${roomName}`;
}

export function formatTakeLine(names: string, amount: number, roomName: string) {
  return `${names} took ${formatUsdt(amount)} USDT on ${roomName} — sit the next round`;
}

export function takeLine(take: PublicTake) {
  return formatTakeLine(take.names, take.amount, take.roomName);
}

export function withSitWhen(line: string, when?: string) {
  if (!when) return line;
  return `${line}. ${when}`;
}

/** Favoured hue first, then the hues named on this seat's takes. */
export function seatHueNames(favoured: string, takes: { names: string }[]) {
  const names: string[] = [];
  const add = (name: string) => {
    const clean = name.trim();
    if (!clean || names.includes(clean)) return;
    names.push(clean);
  };
  add(favoured);
  for (const take of takes) {
    for (const part of take.names.split("&")) add(part);
  }
  return names;
}

export function takePayoutNote(take: Pick<PublicTake, "roomName" | "number" | "names">) {
  return `${take.roomName} round #${take.number} ${take.names} take`;
}

/** Last takes a seat was paid for, matched by the payout note the house already writes. */
export function seatTakesFromNotes(
  takes: PublicTake[],
  notes: Iterable<string>,
  limit = 6,
) {
  const set = new Set(notes);
  const seen = new Set<string>();
  const out: PublicTake[] = [];
  for (const take of [...takes].sort((a, b) => b.at - a.at)) {
    if (seen.has(take.id)) continue;
    if (!set.has(takePayoutNote(take))) continue;
    seen.add(take.id);
    out.push(take);
    if (out.length >= Math.max(1, Math.min(12, limit))) break;
  }
  return out;
}
