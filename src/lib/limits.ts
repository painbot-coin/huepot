import type { PlayLimits, StoreData, User } from "@/lib/types";
import { formatCents, toCents } from "@/lib/money";

const DAY_MS = 24 * 60 * 60 * 1000;

export const COOL_OFF_HOURS = [1, 24, 168] as const;
export const SELF_EXCLUDE_DAYS = [30, 90, 180] as const;
export const MAX_DAILY_LOSS_CAP = 10_000;

export function emptyLimits(): PlayLimits {
  return {
    frozen: false,
    freezeNote: "",
    dailyLossCap: 0,
    coolOffUntil: 0,
    selfExcludeUntil: 0,
  };
}

export function userLimits(user: User): PlayLimits {
  return { ...emptyLimits(), ...user.limits };
}

export function playLossSince(store: StoreData, userId: string, since: number) {
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
  if (limits.dailyLossCap > 0) {
    const loss = playLossSince(store, user.id, Date.now() - DAY_MS) + extraLoss;
    if (loss > limits.dailyLossCap) {
      throw new Error(
        `Daily loss cap is ${formatCents(limits.dailyLossCap)} USDT. Take a break or raise it tomorrow.`,
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
  limits.dailyLossCap = toCents(amount);
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
