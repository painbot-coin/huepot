import { formatUsdt } from "@/lib/money";
import type { PublicTake } from "@/lib/types";

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
