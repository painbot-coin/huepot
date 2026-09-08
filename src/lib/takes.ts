import { colorById } from "./colors";
import { REVEAL_SECONDS } from "./config";
import {
  settledDollars,
  settledTakeAmount,
  type PublicSettledRound,
} from "./fairness";
import {
  getSettledRound,
  listPendingSettled,
  listSettledRounds,
} from "./fairness-db";
import { prisma } from "./db";
import { isHouseUser } from "./house";
import { fromCents } from "./money";
import type { PublicTake, Room, Round, StoreData, TakeWinner } from "./types";

export { formatTakeLine, takeLine } from "./take-copy";

export function takeFromSettled(row: PublicSettledRound): PublicTake | null {
  if (row.kind !== "take" || !row.winners.length) return null;
  if (settledDollars(row, row.losingPot) <= 0) return null;
  const amount = settledTakeAmount(row);
  if (amount <= 0) return null;
  return {
    id: row.id,
    slug: row.roomSlug,
    roomName: row.roomName,
    names: row.winners.map((id) => colorById(id).name).join(" & "),
    winners: [...row.winners],
    amount,
    at: row.settledAt,
    number: row.number,
  };
}

export function takeFromLive(room: Room, round: Round): PublicTake | null {
  const result = round.result;
  if (!result || result.kind !== "take" || !result.winners.length) return null;
  if (result.losingPot <= 0) return null;
  const amount = fromCents(result.payouts.reduce((sum, item) => sum + item.amount, 0));
  if (amount <= 0) return null;
  return {
    id: round.id,
    slug: room.slug,
    roomName: room.name,
    names: result.winners.map((id) => colorById(id).name).join(" & "),
    winners: [...result.winners],
    amount,
    at: round.revealUntil != null ? round.revealUntil - REVEAL_SECONDS * 1000 : Date.now(),
    number: round.number,
  };
}

export function liveTakes(store: StoreData): PublicTake[] {
  const out: PublicTake[] = [];
  for (const room of Object.values(store.rooms)) {
    if (!room.round) continue;
    const take = takeFromLive(room, room.round);
    if (take) out.push(take);
  }
  return out;
}

export async function listPublicTakes(live: PublicTake[], limit = 6) {
  const byId = new Map<string, PublicTake>();
  for (const take of live) byId.set(take.id, take);
  for (const row of listPendingSettled()) {
    const take = takeFromSettled(row);
    if (take) byId.set(take.id, take);
  }
  for (const row of await listSettledRounds(undefined, 24, "take")) {
    const take = takeFromSettled(row);
    if (take) byId.set(take.id, take);
  }
  return [...byId.values()].sort((a, b) => b.at - a.at).slice(0, Math.max(1, Math.min(12, limit)));
}

/**
 * Who was paid for a take. A payout row is noted with the room, the round and
 * the winning colours, which is exactly what a take already carries, so the
 * note can be matched whole — no wildcard, and it works for every round ever
 * settled without storing anything new.
 */
export async function takeWinners(
  take: PublicTake,
  store: StoreData,
): Promise<TakeWinner[]> {
  const note = `${take.roomName} round #${take.number} ${take.names} take`;
  const cents = new Map<string, number>();

  for (const tx of store.txs) {
    if (tx.type === "payout" && tx.note === note) {
      cents.set(tx.playerId, (cents.get(tx.playerId) ?? 0) + tx.amount);
    }
  }
  if (!cents.size) {
    const rows = await prisma.$queryRaw<{ playerId: string; amount: number }[]>`
      SELECT playerId, amount FROM Tx WHERE type = 'payout' AND note = ${note}
    `;
    for (const row of rows) {
      cents.set(row.playerId, (cents.get(row.playerId) ?? 0) + Number(row.amount));
    }
  }

  const winners: TakeWinner[] = [];
  for (const [playerId, amount] of cents) {
    const user = store.users[playerId];
    if (!user || isHouseUser(user)) continue;
    winners.push({
      username: user.username,
      avatar: (user.avatar ?? "").trim(),
      amount: fromCents(amount),
    });
  }
  return winners.sort((a, b) => b.amount - a.amount || a.username.localeCompare(b.username));
}

export async function getPublicTake(id: string, store: StoreData) {
  const needle = id.trim();
  if (!needle) return null;
  for (const room of Object.values(store.rooms)) {
    if (room.round?.id !== needle) continue;
    const take = takeFromLive(room, room.round);
    if (take) return take;
  }
  const pending = listPendingSettled().find((row) => row.id === needle);
  if (pending) return takeFromSettled(pending);
  const row = await getSettledRound(needle);
  return row ? takeFromSettled(row) : null;
}
