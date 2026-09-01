import { formatUsdt } from "./money";
import type { PublicTake } from "./types";

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
