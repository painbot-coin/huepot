import { emptyLimits } from "@/lib/limits";
import { rakeFromPot } from "@/lib/money";
import { ensureUserWallets } from "@/lib/wallets";
import type { StoreData, User } from "@/lib/types";

export const HOUSE_USER_ID = "house";
export const HOUSE_USERNAME = "house";
export const HOUSE_EMAIL = "house@huepot.internal";
export const MAX_RAKE_BPS = 1_000;

export function rakeBps() {
  const value = Number(process.env.HOUSE_RAKE_BPS ?? 500);
  if (!Number.isFinite(value)) return 500;
  return Math.max(0, Math.min(MAX_RAKE_BPS, Math.floor(value)));
}

export function rakePercentLabel(bps = rakeBps()) {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

export { rakeFromPot };

export function isHouseUser(user: { id?: string; username?: string; email?: string } | null) {
  if (!user) return false;
  return (
    user.id === HOUSE_USER_ID ||
    user.username?.toLowerCase() === HOUSE_USERNAME ||
    user.email?.toLowerCase() === HOUSE_EMAIL
  );
}

export function ensureHouseUser(store: StoreData): User {
  const existing = store.users[HOUSE_USER_ID];
  if (existing) {
    existing.username = HOUSE_USERNAME;
    existing.email = HOUSE_EMAIL;
    existing.emailVerified = true;
    existing.ageConfirmedAt ??= Date.now();
    ensureUserWallets(existing);
    return existing;
  }
  const user: User = {
    id: HOUSE_USER_ID,
    email: HOUSE_EMAIL,
    username: HOUSE_USERNAME,
    passwordHash: "",
    googleId: null,
    emailVerified: true,
    verifyToken: null,
    verifyExpires: null,
    verifySentAt: null,
    createdAt: Date.now(),
    balance: 0,
    bonus: 0,
    withdrawAddress: "",
    wallets: {},
    limits: emptyLimits(),
    ageConfirmedAt: Date.now(),
    resetToken: null,
    resetExpires: null,
    resetSentAt: null,
    inviteCode: "",
    invitedBy: null,
    headline: "",
    about: "",
    location: "",
  };
  ensureUserWallets(user);
  store.users[HOUSE_USER_ID] = user;
  return user;
}
