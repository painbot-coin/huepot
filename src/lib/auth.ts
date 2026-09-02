import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import {
  LIVE_CHAIN_ID,
  MAX_WITHDRAW,
  MIN_DEPOSIT,
  MIN_WITHDRAW,
  chainWatchEnabled,
  cookieSecure,
  demoMoneyEnabled,
  liveWithdrawalsEnabled,
} from "./config";
import {
  assertCanCash,
  assertCanDeposit,
  emptyLimits,
  userLimits,
} from "./limits";
import { HOUSE_USERNAME } from "./house";
import { formatCents, toCents } from "./money";
import { isNetworkId, networkById, validateAddress } from "./networks";
import { notify } from "./notifications";
import { newSessionToken } from "./password";
import { applyInviteOnSignup, ensureInviteCode } from "./referrals";
import { toPublicUser } from "./public-user";
import { withStore, withStoreRead } from "./store";
import type { PublicUser, StoreData, User } from "./types";
import { publicWallets, ensureUserWallets } from "./wallets";

export { toPublicUser };

export const SESSION_COOKIE = "huepot_session";
const SESSION_MS = 1000 * 60 * 60 * 24 * 30;

function nowMs() {
  return Date.now();
}

export function pruneSessions(store: StoreData) {
  const at = nowMs();
  for (const [token, session] of Object.entries(store.sessions)) {
    if (session.expiresAt < at) delete store.sessions[token];
  }
  for (const [state, item] of Object.entries(store.oauthStates)) {
    if (item.expiresAt < at) delete store.oauthStates[state];
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string) {
  return username.trim();
}

export function findUserByLogin(store: StoreData, login: string) {
  const email = normalizeEmail(login);
  const username = login.trim().toLowerCase();
  return Object.values(store.users).find(
    (user) =>
      user.email === email || user.username.toLowerCase() === username,
  );
}

export function findUserByGoogleId(store: StoreData, googleId: string) {
  return Object.values(store.users).find((user) => user.googleId === googleId);
}

export function uniqueUsername(store: StoreData, seed: string) {
  const base = (seed.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 16) || "player").padEnd(
    3,
    "1",
  );
  let candidate = base;
  let n = 1;
  while (findUserByLogin(store, candidate) || candidate.toLowerCase() === HOUSE_USERNAME) {
    candidate = `${base}${n}`.slice(0, 20);
    n += 1;
  }
  return candidate;
}

function newUser(
  partial: Omit<
    User,
    | "wallets"
    | "balance"
    | "withdrawAddress"
    | "createdAt"
    | "limits"
    | "ageConfirmedAt"
    | "resetToken"
    | "resetExpires"
    | "resetSentAt"
    | "inviteCode"
    | "invitedBy"
    | "headline"
    | "about"
    | "location"
  > &
    Partial<User>,
): User {
  const user: User = {
    id: partial.id,
    email: partial.email,
    username: partial.username,
    passwordHash: partial.passwordHash,
    googleId: partial.googleId ?? null,
    emailVerified: partial.emailVerified ?? false,
    verifyToken: partial.verifyToken ?? null,
    verifyExpires: partial.verifyExpires ?? null,
    verifySentAt: partial.verifySentAt ?? null,
    createdAt: nowMs(),
    balance: 0,
    withdrawAddress: "",
    wallets: {},
    limits: emptyLimits(),
    ageConfirmedAt: partial.ageConfirmedAt ?? null,
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
  return user;
}

export function loginWithGoogle(
  store: StoreData,
  profile: { googleId: string; email: string; emailVerified: boolean; name: string },
  ageConfirmed = false,
  userAgent = "",
  inviteCode = "",
) {
  let user =
    findUserByGoogleId(store, profile.googleId) ||
    findUserByLogin(store, profile.email);

  if (!user) {
    const local = profile.email.split("@")[0] || "player";
    user = newUser({
      id: crypto.randomUUID(),
      email: profile.email,
      username: uniqueUsername(store, local),
      passwordHash: "",
      googleId: profile.googleId,
      emailVerified: true,
      verifyToken: null,
      verifyExpires: null,
      verifySentAt: null,
      ageConfirmedAt: ageConfirmed ? nowMs() : null,
    });
    store.users[user.id] = user;
    ensureInviteCode(store, user);
    applyInviteOnSignup(store, user, inviteCode);
    notify(store, user.id, {
      kind: "welcome",
      title: "Welcome to Huepot",
      body: "Signed in with Google. Your BNB Chain USDT address is ready on Add USDT. Classic sits 20:00 UTC. Fog cup Sunday 21:00 UTC.",
      href: "/invest",
    });
  } else {
    const firstGoogle = !user.googleId;
    user.googleId = profile.googleId;
    user.emailVerified = true;
    if (ageConfirmed && !user.ageConfirmedAt) user.ageConfirmedAt = nowMs();
    user.verifyToken = null;
    user.verifyExpires = null;
    ensureUserWallets(user);
    ensureInviteCode(store, user);
    if (firstGoogle) {
      notify(store, user.id, {
        kind: "system",
        title: "Google connected",
        body: "You can sign in with Gmail on this account.",
        href: "/account",
      });
    }
  }

  return createSession(store, user.id, userAgent);
}

export function createSession(store: StoreData, userId: string, userAgent = "") {
  pruneSessions(store);
  const hadOtherSessions = Object.values(store.sessions).some(
    (session) => session.userId === userId,
  );
  const token = newSessionToken();
  store.sessions[token] = {
    token,
    userId,
    expiresAt: nowMs() + SESSION_MS,
    createdAt: nowMs(),
    userAgent: userAgent.slice(0, 180),
  };
  const user = store.users[userId];
  return {
    token,
    userId,
    maxAge: SESSION_MS / 1000,
    hadOtherSessions,
    email: user?.email ?? "",
    username: user?.username ?? "",
  };
}

export function createOAuthState(
  store: StoreData,
  ageConfirmed = false,
  inviteCode = "",
) {
  pruneSessions(store);
  const code = normalizeInviteCodeForState(inviteCode);
  const state = `${ageConfirmed ? "1" : "0"}.${code}.${randomBytes(16).toString("hex")}`;
  store.oauthStates[state] = {
    state,
    expiresAt: nowMs() + 1000 * 60 * 10,
  };
  return state;
}

function normalizeInviteCodeForState(raw: string) {
  return raw.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
}

export function takeOAuthState(store: StoreData, state: string) {
  const item = store.oauthStates[state];
  delete store.oauthStates[state];
  if (!item || item.expiresAt < nowMs()) {
    throw new Error("Google sign-in expired. Try again.");
  }
  const parts = state.split(".");
  return {
    ageConfirmed: state.startsWith("1"),
    inviteCode: parts.length >= 3 ? parts[1] ?? "" : "",
  };
}

export function confirmAge(user: User) {
  if (!user.ageConfirmedAt) user.ageConfirmedAt = nowMs();
}

export function changeUsername(store: StoreData, user: User, raw: string) {
  const username = normalizeUsername(raw);
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    throw new Error("Username must be 3–20 letters, numbers, or _.");
  }
  if (username.toLowerCase() === HOUSE_USERNAME) {
    throw new Error("That email or username is already in use.");
  }
  if (username.toLowerCase() === user.username.toLowerCase()) {
    throw new Error("That is already your username.");
  }
  const taken = findUserByLogin(store, username);
  if (taken && taken.id !== user.id) {
    throw new Error("That email or username is already in use.");
  }
  user.username = username;
}

export function listPublicSessions(store: StoreData, userId: string, currentToken: string) {
  const at = nowMs();
  return Object.values(store.sessions)
    .filter((session) => session.userId === userId && session.expiresAt > at)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((session) => ({
      hint: session.token.slice(-10),
      createdAt: session.createdAt || session.expiresAt - SESSION_MS,
      expiresAt: session.expiresAt,
      current: session.token === currentToken,
      userAgent: session.userAgent || "Unknown device",
    }));
}

export function revokeSession(store: StoreData, userId: string, hint: string, currentToken: string) {
  const matches = Object.values(store.sessions).filter(
    (session) => session.userId === userId && session.token.endsWith(hint),
  );
  if (matches.length !== 1) throw new Error("That session was not found.");
  if (matches[0].token === currentToken) {
    throw new Error("Use sign out for this device.");
  }
  delete store.sessions[matches[0].token];
}

export function revokeOtherSessions(store: StoreData, userId: string, currentToken: string) {
  for (const [token, session] of Object.entries(store.sessions)) {
    if (session.userId === userId && token !== currentToken) delete store.sessions[token];
  }
}

export function signout(store: StoreData, token: string | undefined) {
  if (token) delete store.sessions[token];
}

export async function getSessionToken() {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value;
}

export async function setSessionCookie(token: string, maxAge: number) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getHeaderUser() {
  const token = await getSessionToken();
  if (!token) return null;
  return withStoreRead((store) => {
    const user = userFromToken(store, token);
    if (!user) return null;
    return toPublicUser(user, [], store);
  });
}

export function userFromToken(store: StoreData, token: string | undefined) {
  if (!token) return null;
  const session = store.sessions[token];
  if (!session || session.expiresAt < nowMs()) return null;
  const user = store.users[session.userId];
  return user ?? null;
}

export function requireUser(store: StoreData, token: string | undefined) {
  const user = userFromToken(store, token);
  if (!user) {
    const error = new Error("Sign in to continue.");
    (error as Error & { status: number }).status = 401;
    throw error;
  }
  ensureUserWallets(user);
  ensureInviteCode(store, user);
  return user;
}

export function requireVerified(user: User) {
  if (!user.emailVerified) {
    const error = new Error("Sign in with Google to continue.");
    (error as Error & { status: number }).status = 403;
    throw error;
  }
}

export { creditConfirmedDeposit, refundQueuedWithdraw } from "./ledger";

export function depositToNetwork(
  store: StoreData,
  user: User,
  amount: number,
  networkId: string,
) {
  assertCanDeposit(user);
  if (!demoMoneyEnabled()) {
    throw new Error(
      chainWatchEnabled()
        ? "Send BEP-20 USDT to your BNB Chain address. Credit lands after confirms."
        : "Live deposits are not open yet. Send USDT to your BNB Chain address and wait for credit.",
    );
  }
  if (!isNetworkId(networkId)) {
    throw new Error("Pick a deposit network.");
  }
  if (!Number.isFinite(amount) || amount < MIN_DEPOSIT) {
    throw new Error(`Minimum deposit is ${MIN_DEPOSIT} USDT.`);
  }
  const network = networkById(networkId);
  const credit = toCents(amount);
  user.balance += credit;
  store.txs.unshift({
    id: crypto.randomUUID(),
    playerId: user.id,
    type: "deposit",
    amount: credit,
    createdAt: nowMs(),
    note: `${network.standard} ${network.asset} on ${network.name}`,
  });
  store.txs = store.txs.slice(0, 400);
  notify(store, user.id, {
    kind: "deposit",
    title: "Deposit credited",
    body: `${formatCents(credit)} USDT via ${network.standard} on ${network.name}.`,
    href: "/invest",
  });
}

export function withdrawFromNetwork(
  store: StoreData,
  user: User,
  amount: number,
  networkId: string,
  address: string,
  queuedId?: string,
) {
  assertCanCash(user);
  if (!isNetworkId(networkId)) {
    throw new Error("Pick a withdraw network.");
  }
  const live = liveWithdrawalsEnabled();
  if (live && networkId !== LIVE_CHAIN_ID) {
    throw new Error("Cash-out is BNB Chain USDT only.");
  }
  const network = networkById(networkId);
  const cleaned = address.trim();
  if (!validateAddress(network.family, cleaned)) {
    throw new Error(`Enter a valid ${network.name} address.`);
  }
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAW) {
    throw new Error(`Minimum withdraw is ${MIN_WITHDRAW} USDT.`);
  }
  if (live && amount > MAX_WITHDRAW) {
    throw new Error(`Maximum withdraw is ${MAX_WITHDRAW} USDT.`);
  }
  const debit = toCents(amount);
  if (debit > user.balance) {
    throw new Error("Not enough balance to withdraw.");
  }
  const payoutId = queuedId ?? crypto.randomUUID();
  user.balance -= debit;
  user.withdrawAddress = cleaned;
  const short = `${cleaned.slice(0, 6)}…${cleaned.slice(-4)}`;
  store.txs.unshift({
    id: payoutId,
    playerId: user.id,
    type: "withdraw",
    amount: debit,
    createdAt: nowMs(),
    note: live
      ? `Queued · ${network.name} ${short}`
      : `To ${network.name} ${short} (demo)`,
  });
  store.txs = store.txs.slice(0, 400);
  notify(store, user.id, {
    kind: "withdraw",
    title: live ? "Withdraw sending" : "Withdraw sent",
    body: live
      ? `${formatCents(debit)} USDT is leaving on ${network.name}.`
      : `${formatCents(debit)} USDT to ${network.name}.`,
    href: "/withdraw",
  });
  return { id: payoutId, amount: debit, address: cleaned };
}
