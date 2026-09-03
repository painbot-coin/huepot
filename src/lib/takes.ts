import { colorById } from "./colors";
import { REVEAL_SECONDS } from "./config";
import { settledDollars, type PublicSettledRound } from "./fairness";
import {
  getSettledRound,
  listPendingSettled,
  listSettledRounds,
} from "./fairness-db";
import { fromCents } from "./money";
import type { PublicTake, Room, Round, StoreData } from "./types";

export { formatTakeLine, takeLine } from "./take-copy";

export function takeFromSettled(row: PublicSettledRound): PublicTake | null {
  if (row.kind !== "take" || !row.winners.length) return null;
  const losing = settledDollars(row, row.losingPot);
  if (losing <= 0) return null;
  const rake = settledDollars(row, row.rake);
  const click = settledDollars(row, row.clickPrice);
  const amount = Math.max(0, losing - rake) + row.winningClicks * click;
  if (amount <= 0) return null;
  return {
    id: row.id,
    slug: row.roomSlug,
    roomName: row.roomName,
    names: row.winners.map((id) => colorById(id).name).join(" & "),
    amount,
    at: row.settledAt,
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
    amount,
    at: round.revealUntil != null ? round.revealUntil - REVEAL_SECONDS * 1000 : Date.now(),
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
  for (const row of await listSettledRounds(undefined, 24)) {
    const take = takeFromSettled(row);
    if (take) byId.set(take.id, take);
  }
  return [...byId.values()].sort((a, b) => b.at - a.at).slice(0, Math.max(1, Math.min(12, limit)));
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
