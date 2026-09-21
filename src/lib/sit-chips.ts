import { dayIndex } from "@/lib/tasks";
import type { Room, Round, StoreData, User } from "@/lib/types";

/** One Classic click. Play only — never withdrawable. */
export const SIT_CHIP_CENTS = 100;
export const FIRST_SIT_NOTE = "First sit";

export function dailySitNote(day: number) {
  return `Daily sit ${day}`;
}

export function sitClickSuffix(sit: number) {
  return sit > 0 ? ` · sit:${sit}` : "";
}

export function sitFromClickNote(note: string) {
  const match = /(?:^| )· sit:(\d+)\s*$/.exec(note);
  if (!match) return 0;
  return Math.max(0, Math.round(Number(match[1]) || 0));
}

export function userBonus(user: User) {
  return Math.max(0, Math.round(user.bonus ?? 0));
}

export function sitBank(user: Pick<User, "balance" | "bonus">) {
  return Math.max(0, Math.round(user.balance ?? 0)) + userBonus(user as User);
}

/**
 * Cash implied from rows — the same rule the books use.
 * Out: withdraw, click. Bonus grants are chips, not cash. Sit is signed
 * and offsets a click (or a refund) so sit chips cannot mint bank.
 */
export function cashImpliedCents(txs: { type: string; amount: number }[]) {
  let cents = 0;
  for (const tx of txs) {
    if (tx.type === "withdraw" || tx.type === "click") cents -= tx.amount;
    else if (tx.type === "bonus") cents += 0;
    else cents += tx.amount;
  }
  return cents;
}

export function spendSit(user: User, price: number) {
  const sit = Math.min(userBonus(user), price);
  const cash = price - sit;
  user.bonus = userBonus(user) - sit;
  user.balance -= cash;
  return { sit, cash };
}

export function returnSit(user: User, total: number, sit: number) {
  const used = Math.min(Math.max(0, sit), total);
  const cash = total - used;
  user.bonus = userBonus(user) + used;
  user.balance += cash;
  return { sit: used, cash };
}

export function sitSpentOnRound(
  store: StoreData,
  room: Room,
  round: Round,
  playerId: string,
) {
  const tracked = Math.max(0, Math.round(round.sitByPlayer?.[playerId] ?? 0));
  if (tracked > 0) return tracked;
  const mark = ` in ${room.name} #${round.number}`;
  let sit = 0;
  for (const tx of store.txs) {
    if (tx.playerId !== playerId || tx.type !== "click") continue;
    if (!tx.note.includes(mark)) continue;
    sit += sitFromClickNote(tx.note);
  }
  return sit;
}

export function noteSitOnRound(round: Round, playerId: string, sit: number) {
  if (sit <= 0) return;
  round.sitByPlayer = { ...(round.sitByPlayer ?? {}) };
  round.sitByPlayer[playerId] = (round.sitByPlayer[playerId] ?? 0) + sit;
}

export function nextSitGrantNote(
  notes: Iterable<string>,
  at = Date.now(),
  firstAt: number | null = null,
) {
  const have = new Set(notes);
  if (!have.has(FIRST_SIT_NOTE)) return FIRST_SIT_NOTE;
  // First sit is today's chip. Daily starts the next UTC day.
  if (firstAt != null && dayIndex(firstAt) >= dayIndex(at)) return null;
  const daily = dailySitNote(dayIndex(at));
  if (!have.has(daily)) return daily;
  return null;
}

export function sitShortMessage(price: number, bonus: number) {
  if (bonus > 0 && bonus < price) {
    return "Sit chips do not cover this table. Add USDT to sit.";
  }
  return "Not enough to sit. Add USDT or wait for tomorrow's sit chip.";
}
