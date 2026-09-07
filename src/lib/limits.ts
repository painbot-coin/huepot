import { prisma } from "@/lib/db";
import type { PlayLimits, StoreData, Tx, User } from "@/lib/types";
import { formatCents, toCents } from "@/lib/money";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WINDOW_HOURS = 24;

/**
 * Play loss per player, kept in hourly buckets so the day actually rolls off.
 * A single running total could only ever grow, which turns a daily cap into a
 * permanent one until the process restarts.
 */
const lossBuckets = new Map<string, Map<number, number>>();

const bucketOf = (at: number) => Math.floor(at / HOUR_MS);

function dropOldBuckets(buckets: Map<number, number>, at: number) {
  const oldest = bucketOf(at) - WINDOW_HOURS;
  for (const hour of buckets.keys()) {
    if (hour < oldest) buckets.delete(hour);
  }
}

export async function warmPlayLoss() {
  const since = Date.now() - DAY_MS;
  // createdAt is a BigInt column and this driver cannot read one directly.
  const rows = await prisma.$queryRaw<
    { playerId: string; type: string; amount: number; createdAt: string }[]
  >`
    SELECT playerId, type, amount, CAST(createdAt AS TEXT) AS createdAt FROM Tx
    WHERE createdAt >= ${since} AND type IN ('click', 'payout', 'refund')
  `;
  lossBuckets.clear();
  for (const row of rows) {
    notePlayTx(row.playerId, row.type as Tx["type"], Number(row.amount), Number(row.createdAt));
  }
}

export function notePlayTx(
  playerId: string,
  type: Tx["type"],
  amount: number,
  at = Date.now(),
) {
  if (type !== "click" && type !== "payout" && type !== "refund") return;
  const buckets = lossBuckets.get(playerId) ?? new Map<number, number>();
  const hour = bucketOf(at);
  const delta = type === "click" ? amount : -amount;
  buckets.set(hour, (buckets.get(hour) ?? 0) + delta);
  dropOldBuckets(buckets, Date.now());
  lossBuckets.set(playerId, buckets);
}

export const COOL_OFF_HOURS = [1, 24, 168] as const;
export const SELF_EXCLUDE_DAYS = [30, 90, 180] as const;
export const MAX_DAILY_LOSS_CAP = 10_000;

/** A looser cap only takes hold after this long. Tightening is immediate. */
export const LOOSEN_DELAY_MS = DAY_MS;

export function emptyLimits(): PlayLimits {
  return {
    frozen: false,
    freezeNote: "",
    dailyLossCap: 0,
    coolOffUntil: 0,
    selfExcludeUntil: 0,
    pendingLossCap: null,
    pendingLossCapAt: 0,
  };
}

export function userLimits(user: User): PlayLimits {
  return { ...emptyLimits(), ...user.limits };
}

/**
 * The cap in force right now. A cap the player asked to raise counts only once
 * its wait is over, so it cannot be undone in the moment it starts to bite.
 */
export function effectiveLossCap(limits: PlayLimits, at = Date.now()) {
  if (limits.pendingLossCap != null && at >= limits.pendingLossCapAt) {
    return limits.pendingLossCap;
  }
  return limits.dailyLossCap;
}

export function playLossSince(store: StoreData, userId: string, since: number) {
  const buckets = lossBuckets.get(userId);
  if (buckets) {
    dropOldBuckets(buckets, Date.now());
    const from = bucketOf(since);
    // Walked in order and held at zero, so a player who is ahead cannot bank
    // the winnings as extra room to lose. Coming back from a win still counts.
    const hours = [...buckets.keys()].filter((hour) => hour >= from).sort((a, b) => a - b);
    let cents = 0;
    for (const hour of hours) {
      cents = Math.max(0, cents + (buckets.get(hour) ?? 0));
    }
    return Math.round(cents);
  }
  let loss = 0;
  for (const tx of store.txs) {
    if (tx.playerId !== userId || tx.createdAt < since) continue;
    if (tx.type === "click") loss += tx.amount;
    if (tx.type === "payout" || tx.type === "refund") loss -= tx.amount;
  }
  return Math.max(0, Math.round(loss));
}

export function playBlock(user: User, at = Date.now()) {
  const limits = userLimits(user);
  if (limits.frozen) {
    return {
      kind: "frozen" as const,
      until: 0,
      message: limits.freezeNote
        ? `Account frozen. ${limits.freezeNote}`
        : "This account is frozen.",
    };
  }
  if (limits.selfExcludeUntil > at) {
    return {
      kind: "self-exclude" as const,
      until: limits.selfExcludeUntil,
      message: `Self-excluded until ${new Date(limits.selfExcludeUntil).toLocaleString()}.`,
    };
  }
  if (limits.coolOffUntil > at) {
    return {
      kind: "cool-off" as const,
      until: limits.coolOffUntil,
      message: `Cool-off until ${new Date(limits.coolOffUntil).toLocaleString()}.`,
    };
  }
  if (!user.ageConfirmedAt) {
    return {
      kind: "age" as const,
      until: 0,
      message: "Confirm you are 18 or older to invest and play.",
    };
  }
  return null;
}

export function assertCanPlay(store: StoreData, user: User, extraLoss = 0) {
  const block = playBlock(user);
  if (block) throw new Error(block.message);
  const limits = userLimits(user);
  const cap = effectiveLossCap(limits);
  if (cap > 0) {
    const loss = playLossSince(store, user.id, Date.now() - DAY_MS) + extraLoss;
    if (loss > cap) {
      throw new Error(
        `Daily loss cap is ${formatCents(cap)} USDT. A higher cap starts a day after you ask for it.`,
      );
    }
  }
}

export function assertCanCash(user: User) {
  const limits = userLimits(user);
  if (limits.frozen) {
    throw new Error(
      limits.freezeNote ? `Account frozen. ${limits.freezeNote}` : "This account is frozen.",
    );
  }
}

export function assertCanDeposit(user: User) {
  const block = playBlock(user);
  if (block) throw new Error(block.message);
}

export function setDailyLossCap(user: User, amount: number) {
  const limits = userLimits(user);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_DAILY_LOSS_CAP) {
    throw new Error(`Daily loss cap must be 0–${MAX_DAILY_LOSS_CAP} USDT.`);
  }
  const next = toCents(amount);
  const current = effectiveLossCap(limits);
  // Where 0 means no cap, so it is the loosest setting there is.
  const tighter = next > 0 && (current === 0 || next < current);
  if (next === current) {
    limits.pendingLossCap = null;
    limits.pendingLossCapAt = 0;
  } else if (tighter) {
    limits.dailyLossCap = next;
    limits.pendingLossCap = null;
    limits.pendingLossCapAt = 0;
  } else {
    // Asking for more room is the one change a player should not be able to
    // make in the moment they are chasing a loss.
    limits.dailyLossCap = current;
    limits.pendingLossCap = next;
    limits.pendingLossCapAt = Date.now() + LOOSEN_DELAY_MS;
  }
  user.limits = limits;
}

export function startCoolOff(user: User, hours: number) {
  if (!COOL_OFF_HOURS.includes(hours as (typeof COOL_OFF_HOURS)[number])) {
    throw new Error("Pick a cool-off of 1 hour, 24 hours, or 7 days.");
  }
  const limits = userLimits(user);
  const until = Date.now() + hours * 60 * 60 * 1000;
  if (limits.selfExcludeUntil > Date.now()) {
    throw new Error("Self-exclusion is already on. It cannot be shortened.");
  }
  limits.coolOffUntil = Math.max(limits.coolOffUntil, until);
  user.limits = limits;
}

export function startSelfExclude(user: User, days: number) {
  if (!SELF_EXCLUDE_DAYS.includes(days as (typeof SELF_EXCLUDE_DAYS)[number])) {
    throw new Error("Pick a self-exclusion of 30, 90, or 180 days.");
  }
  const limits = userLimits(user);
  const until = Date.now() + days * DAY_MS;
  limits.selfExcludeUntil = Math.max(limits.selfExcludeUntil, until);
  limits.coolOffUntil = Math.max(limits.coolOffUntil, until);
  user.limits = limits;
}
