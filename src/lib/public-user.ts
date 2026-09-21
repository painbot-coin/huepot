import { effectiveLossCap, playBlock, playLossSince, userLimits } from "./limits";
import { fromCents } from "./money";
import { unreadCount } from "./notifications";
import {
  inviteDailyCapCents,
  inviteEarnedCents,
  inviteEarnedTodayCents,
} from "./referrals";
import type { PublicUser, StoreData, User } from "./types";
import { publicWallets } from "./wallets";

export function toPublicUser(user: User, txs: PublicUser["txs"], store?: StoreData): PublicUser {
  const block = playBlock(user);
  const limits = userLimits(user);
  const earned = store ? inviteEarnedCents(store, user.id) : 0;
  const earnedToday = store ? inviteEarnedTodayCents(store, user.id) : 0;
  const cap = inviteDailyCapCents();
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    shortId: user.username,
    balance: fromCents(user.balance),
    bonus: fromCents(user.bonus ?? 0),
    withdrawAddress: user.withdrawAddress,
    createdAt: user.createdAt,
    emailVerified: user.emailVerified,
    hasGoogle: Boolean(user.googleId),
    unreadCount: store ? unreadCount(store, user.id) : 0,
    wallets: publicWallets(user),
    txs: txs.map((tx) => ({ ...tx, amount: fromCents(tx.amount) })),
    frozen: limits.frozen,
    blocked: Boolean(block),
    blockKind: block?.kind ?? null,
    blockUntil: block?.until ? block.until : null,
    blockMessage: block?.message ?? "",
    dailyLossCap: fromCents(effectiveLossCap(limits)),
    playLossToday: store
      ? fromCents(playLossSince(store, user.id, Date.now() - 24 * 60 * 60 * 1000))
      : 0,
    pendingLossCap:
      limits.pendingLossCap == null ? null : fromCents(limits.pendingLossCap),
    pendingLossCapAt: limits.pendingLossCapAt,
    ageConfirmed: Boolean(user.ageConfirmedAt),
    inviteCode: user.inviteCode || "",
    inviteEarned: fromCents(earned),
    inviteEarnedToday: fromCents(earnedToday),
    inviteDailyLeft: fromCents(Math.max(0, cap - earnedToday)),
  };
}
