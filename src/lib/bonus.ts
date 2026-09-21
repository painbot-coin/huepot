import { prisma } from "@/lib/db";
import { isHouseUser } from "@/lib/house";
import { formatCents } from "@/lib/money";
import { notify } from "@/lib/notifications";
import {
  FIRST_SIT_NOTE,
  SIT_CHIP_CENTS,
  dailySitNote,
  nextSitGrantNote,
  userBonus,
} from "@/lib/sit-chips";
import { dayIndex } from "@/lib/tasks";
import type { StoreData, User } from "@/lib/types";

export {
  FIRST_SIT_NOTE,
  SIT_CHIP_CENTS,
  cashImpliedCents,
  dailySitNote,
  nextSitGrantNote,
  noteSitOnRound,
  returnSit,
  sitBank,
  sitClickSuffix,
  sitFromClickNote,
  sitShortMessage,
  sitSpentOnRound,
  spendSit,
  userBonus,
} from "@/lib/sit-chips";

function bonusNotesInStore(store: StoreData, userId: string) {
  return store.txs.filter((tx) => tx.playerId === userId && tx.type === "bonus");
}

async function bonusNoteAt(store: StoreData, userId: string, note: string) {
  const local = bonusNotesInStore(store, userId).find((tx) => tx.note === note);
  if (local) return local.createdAt;
  const rows = await prisma.$queryRaw<{ createdAt: number | bigint | string }[]>`
    SELECT CAST(createdAt AS TEXT) AS createdAt FROM Tx
     WHERE playerId = ${userId} AND type = 'bonus' AND note = ${note}
     LIMIT 1
  `;
  if (!rows[0]) return null;
  return Number(rows[0].createdAt);
}

function grantSitChip(store: StoreData, user: User, note: string, at: number) {
  user.bonus = userBonus(user) + SIT_CHIP_CENTS;
  store.txs.unshift({
    id: crypto.randomUUID(),
    playerId: user.id,
    type: "bonus",
    amount: SIT_CHIP_CENTS,
    createdAt: at,
    note,
  });
  store.txs = store.txs.slice(0, 400);
  notify(store, user.id, {
    kind: "system",
    title: note === FIRST_SIT_NOTE ? "First sit chip" : "Today's sit chip",
    body: `${formatCents(SIT_CHIP_CENTS)} USDT to sit. Play only — not withdrawable.`,
    href: "/rooms/classic",
  });
}

export async function ensureSitChips(store: StoreData, user: User, at = Date.now()) {
  if (isHouseUser(user) || user.closedAt) return;
  user.bonus ??= 0;
  const notes = new Set(bonusNotesInStore(store, user.id).map((tx) => tx.note));
  const firstAt = await bonusNoteAt(store, user.id, FIRST_SIT_NOTE);
  if (firstAt != null) notes.add(FIRST_SIT_NOTE);
  const daily = dailySitNote(dayIndex(at));
  if ((await bonusNoteAt(store, user.id, daily)) != null) notes.add(daily);
  const next = nextSitGrantNote(notes, at, firstAt);
  if (next) grantSitChip(store, user, next, at);
}
