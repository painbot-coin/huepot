import { notify } from "@/lib/notifications";
import { emptyLimits, userLimits } from "@/lib/limits";
import { formatCents, fromCents, toCents } from "@/lib/money";
import type { StoreData, User } from "@/lib/types";

export type StaffUserRow = {
  id: string;
  username: string;
  email: string;
  balance: number;
  createdAt: number;
  frozen: boolean;
  freezeNote: string;
  dailyLossCap: number;
  coolOffUntil: number;
  selfExcludeUntil: number;
};

export function searchStaffUsers(store: StoreData, query: string): StaffUserRow[] {
  const needle = query.trim().toLowerCase();
  const users = Object.values(store.users);
  const matched = needle
    ? users.filter(
        (user) =>
          user.username.toLowerCase().includes(needle) ||
          user.email.toLowerCase().includes(needle) ||
          user.id.toLowerCase().includes(needle),
      )
    : [...users].sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
  return matched.slice(0, 30).map(toStaffUser);
}

function toStaffUser(user: User): StaffUserRow {
  const limits = userLimits(user);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    balance: fromCents(user.balance),
    createdAt: user.createdAt,
    frozen: limits.frozen,
    freezeNote: limits.freezeNote,
    dailyLossCap: fromCents(limits.dailyLossCap),
    coolOffUntil: limits.coolOffUntil,
    selfExcludeUntil: limits.selfExcludeUntil,
  };
}

export function staffFreezeUser(store: StoreData, userId: string, note: string, frozen: boolean) {
  const user = store.users[userId];
  if (!user) throw new Error("That player was not found.");
  const limits = userLimits(user);
  limits.frozen = frozen;
  limits.freezeNote = frozen ? note.trim().slice(0, 160) : "";
  user.limits = limits;
  notify(store, user.id, {
    kind: "system",
    title: frozen ? "Account frozen" : "Account unfrozen",
    body: frozen
      ? limits.freezeNote || "Staff froze this account."
      : "Staff lifted the freeze. You can play again.",
    href: "/account",
  });
}

export function staffAdjustBalance(
  store: StoreData,
  userId: string,
  amount: number,
  reason: string,
) {
  const user = store.users[userId];
  if (!user) throw new Error("That player was not found.");
  const note = reason.trim();
  if (note.length < 4) throw new Error("Give a reason of at least 4 characters.");
  const delta = toCents(Number(amount));
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error("Enter a non-zero adjust amount.");
  }
  const next = user.balance + delta;
  if (next < 0) throw new Error("That adjust would put the bank below zero.");
  user.balance = next;
  store.txs.unshift({
    id: crypto.randomUUID(),
    playerId: user.id,
    type: "adjust",
    // Signed, unlike every other row, because an adjust is the only type whose
    // direction is not implied by the type. Storing it unsigned made a staff
    // debit read as money arriving when the books rebuild balances from rows,
    // which is exactly the drift that check exists to catch.
    amount: delta,
    createdAt: Date.now(),
    note: `${delta > 0 ? "Staff credit" : "Staff debit"} · ${note}`,
  });
  store.txs = store.txs.slice(0, 400);
  notify(store, user.id, {
    kind: "system",
    title: "Balance adjusted",
    body: `${delta > 0 ? "+" : "−"}${formatCents(Math.abs(delta))} USDT · ${note}`,
    href: "/account",
  });
}

export function staffRoomRows(store: StoreData) {
  return Object.values(store.rooms)
    .map((room) => ({
      slug: room.slug,
      name: room.name,
      kind: room.kind,
      status: room.round?.status ?? "live",
      roundNumber: room.roundNumber,
      pot: room.round
        ? fromCents(
            room.round.buttonIds.reduce((sum, id) => sum + room.round!.totals[id], 0) *
              room.round.clickPrice,
          )
        : 0,
      players: room.playerIds.length,
      live: room.round?.status === "live",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export { emptyLimits };
