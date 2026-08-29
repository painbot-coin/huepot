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
import { HOUSE_EMAIL, HOUSE_USERNAME } from "./house";
import { sendMail, verifyEmailHtml, verifyUrl, resetEmailHtml, resetUrl } from "./mail";
import { formatCents, toCents } from "./money";
import { isNetworkId, networkById, validateAddress } from "./networks";
import { notify } from "./notifications";
import { hashPassword, newSessionToken, verifyPassword } from "./password";
import { toPublicUser } from "./public-user";
import { withStore, withStoreRead } from "./store";
import type { PublicUser, StoreData, User } from "./types";
import { publicWallets, ensureUserWallets } from "./wallets";

export { toPublicUser };

export const SESSION_COOKIE = "huepot_session";
const SESSION_MS = 1000 * 60 * 60 * 24 * 30;
const VERIFY_MS = 1000 * 60 * 60 * 24;

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

export function issueVerifyToken(user: User) {
  const token = randomBytes(24).toString("hex");
  user.verifyToken = token;
  user.verifyExpires = nowMs() + VERIFY_MS;
  user.verifySentAt = nowMs();
  return token;
}

export async function sendResetMail(user: { email: string; username: string; resetToken: string | null }) {
  if (!user.resetToken) return { sent: false, error: "Missing token.", resetUrl: "" };
  const mail = await sendMail(
    user.email,
    "Reset your Huepot password",
    resetEmailHtml(user.username, user.resetToken),
  );
  return { ...mail, resetUrl: resetUrl(user.resetToken) };
}

export async function sendVerifyMail(user: User) {
  const token = user.verifyToken || issueVerifyToken(user);
  const mail = await sendMail(
    user.email,
    "Verify your Huepot email",
    verifyEmailHtml(user.username, token),
  );
  return { ...mail, verifyUrl: verifyUrl(token) };
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
  };
  ensureUserWallets(user);
  return user;
}

export function signup(
  store: StoreData,
  input: { email: string; username: string; password: string; ageConfirmed?: boolean },
  userAgent = "",
) {
  if (!input.ageConfirmed) {
    throw new Error("Confirm you are 18 or older.");
  }
  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);
  const password = input.password;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    throw new Error("Username must be 3–20 letters, numbers, or _.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (username.toLowerCase() === HOUSE_USERNAME || email === HOUSE_EMAIL) {
    throw new Error("That email or username is already in use.");
  }
  if (findUserByLogin(store, email) || findUserByLogin(store, username)) {
    throw new Error("That email or username is already in use.");
  }

  const user = newUser({
    id: crypto.randomUUID(),
    email,
    username,
    passwordHash: hashPassword(password),
    googleId: null,
    emailVerified: false,
    verifyToken: null,
    verifyExpires: null,
    verifySentAt: null,
    ageConfirmedAt: nowMs(),
  });
  issueVerifyToken(user);
  store.users[user.id] = user;
  notify(store, user.id, {
    kind: "welcome",
    title: "Welcome to Huepot",
    body: "Your wallets are ready. Verify your email to invest and play.",
    href: "/verify-email",
  });
  notify(store, user.id, {
    kind: "verify",
    title: "Verify your email",
    body: `We sent a link to ${user.email}.`,
    href: "/verify-email",
  });
  return { session: createSession(store, user.id, userAgent), user };
}

export function signin(
  store: StoreData,
  input: { login: string; password: string },
  userAgent = "",
) {
  const user = findUserByLogin(store, input.login);
  if (!user) {
    throw new Error("Wrong email/username or password.");
  }
  if (!user.passwordHash) {
    throw new Error("This account uses Google. Continue with Google.");
  }
  if (!verifyPassword(input.password, user.passwordHash)) {
    throw new Error("Wrong email/username or password.");
  }
  ensureUserWallets(user);
  return createSession(store, user.id, userAgent);
}

export function loginWithGoogle(
  store: StoreData,
  profile: { googleId: string; email: string; emailVerified: boolean; name: string },
  ageConfirmed = false,
  userAgent = "",
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
    notify(store, user.id, {
      kind: "welcome",
      title: "Welcome to Huepot",
      body: "Signed in with Google. Your wallets are ready.",
      href: "/invest",
    });
  } else {
    const firstGoogle = !user.googleId;
    user.googleId = profile.googleId;
    if (profile.emailVerified) user.emailVerified = true;
    if (ageConfirmed && !user.ageConfirmedAt) user.ageConfirmedAt = nowMs();
    user.verifyToken = null;
    user.verifyExpires = null;
    ensureUserWallets(user);
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

export function verifyEmailToken(store: StoreData, token: string) {
  const cleaned = token.trim();
  if (!cleaned) throw new Error("Missing verification token.");
  const user = Object.values(store.users).find(
    (item) => item.verifyToken === cleaned,
  );
  if (!user || !user.verifyExpires || user.verifyExpires < nowMs()) {
    throw new Error("That verification link is invalid or expired.");
  }
  user.emailVerified = true;
  user.verifyToken = null;
  user.verifyExpires = null;
  notify(store, user.id, {
    kind: "verified",
    title: "Email verified",
    body: "You can invest, click, and withdraw now.",
    href: "/invest",
  });
  return user;
}

export function prepareResend(store: StoreData, user: User) {
  if (user.emailVerified) {
    throw new Error("Email is already verified.");
  }
  if (user.verifySentAt && nowMs() - user.verifySentAt < 60_000) {
    throw new Error("Wait a minute before requesting another email.");
  }
  issueVerifyToken(user);
  notify(store, user.id, {
    kind: "verify",
    title: "Verification email sent",
    body: `Check ${user.email}.`,
    href: "/verify-email",
  });
  return user;
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

export function createOAuthState(store: StoreData, ageConfirmed = false) {
  pruneSessions(store);
  const state = `${ageConfirmed ? "1" : "0"}${randomBytes(16).toString("hex")}`;
  store.oauthStates[state] = {
    state,
    expiresAt: nowMs() + 1000 * 60 * 10,
  };
  return state;
}

export function takeOAuthState(store: StoreData, state: string) {
  const item = store.oauthStates[state];
  delete store.oauthStates[state];
  if (!item || item.expiresAt < nowMs()) {
    throw new Error("Google sign-in expired. Try again.");
  }
  return { ageConfirmed: state.startsWith("1") };
}

export function confirmAge(user: User) {
  if (!user.ageConfirmedAt) user.ageConfirmedAt = nowMs();
}

const RESET_MS = 1000 * 60 * 60;

export function requestPasswordReset(store: StoreData, email: string) {
  const user = findUserByLogin(store, email);
  if (!user || !user.passwordHash) return null;
  if (user.resetSentAt && nowMs() - user.resetSentAt < 60_000) return user;
  user.resetToken = randomBytes(24).toString("hex");
  user.resetExpires = nowMs() + RESET_MS;
  user.resetSentAt = nowMs();
  return user;
}

export function resetPassword(store: StoreData, token: string, password: string) {
  const cleaned = token.trim();
  if (!cleaned) throw new Error("Missing reset token.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  const user = Object.values(store.users).find((item) => item.resetToken === cleaned);
  if (!user || !user.resetExpires || user.resetExpires < nowMs()) {
    throw new Error("That reset link is invalid or expired.");
  }
  user.passwordHash = hashPassword(password);
  user.resetToken = null;
  user.resetExpires = null;
  for (const [tokenKey, session] of Object.entries(store.sessions)) {
    if (session.userId === user.id) delete store.sessions[tokenKey];
  }
  notify(store, user.id, {
    kind: "system",
    title: "Password changed",
    body: "Your password was reset. Other devices were signed out.",
    href: "/signin",
  });
  return user;
}

export function changePassword(user: User, current: string, next: string) {
  if (!user.passwordHash) {
    throw new Error("This account uses Google. Add a password reset from email signup, or keep using Google.");
  }
  if (!verifyPassword(current, user.passwordHash)) {
    throw new Error("Current password is wrong.");
  }
  if (next.length < 8) throw new Error("Password must be at least 8 characters.");
  if (current === next) throw new Error("Pick a new password.");
  user.passwordHash = hashPassword(next);
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

export function changeEmail(store: StoreData, user: User, raw: string, currentPassword: string) {
  const email = normalizeEmail(raw);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (email === user.email) throw new Error("That is already your email.");
  if (email === HOUSE_EMAIL) {
    throw new Error("That email or username is already in use.");
  }
  const taken = findUserByLogin(store, email);
  if (taken && taken.id !== user.id) {
    throw new Error("That email or username is already in use.");
  }
  if (user.passwordHash) {
    if (!currentPassword) throw new Error("Enter your current password.");
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      throw new Error("Current password is wrong.");
    }
  }
  const previous = user.email;
  user.email = email;
  user.emailVerified = false;
  issueVerifyToken(user);
  notify(store, user.id, {
    kind: "verify",
    title: "Verify your new email",
    body: `Confirm ${email} before you invest or click.`,
    href: "/verify-email",
  });
  return previous;
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
  return user;
}

export function requireVerified(user: User) {
  if (!user.emailVerified) {
    const error = new Error("Verify your email to continue.");
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
    title: live ? "Withdraw queued" : "Withdraw sent",
    body: live
      ? `${formatCents(debit)} USDT is waiting to be sent on ${network.name}.`
      : `${formatCents(debit)} USDT to ${network.name}.`,
    href: "/withdraw",
  });
  return { id: payoutId, amount: debit, address: cleaned };
}
