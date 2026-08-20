import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { MIN_DEPOSIT, MIN_WITHDRAW } from "./config";
import { sendMail, verifyEmailHtml, verifyUrl } from "./mail";
import { isNetworkId, networkById, validateAddress } from "./networks";
import { notify, unreadCount } from "./notifications";
import { hashPassword, newSessionToken, verifyPassword } from "./password";
import { withStore } from "./store";
import type { PublicUser, StoreData, User } from "./types";
import { publicWallets, ensureUserWallets } from "./wallets";

export const SESSION_COOKIE = "huepot_session";
const SESSION_MS = 1000 * 60 * 60 * 24 * 30;
const VERIFY_MS = 1000 * 60 * 60 * 24;

function nowMs() {
  return Date.now();
}

export function toPublicUser(user: User, txs: PublicUser["txs"], store?: StoreData): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    shortId: user.username,
    balance: user.balance,
    withdrawAddress: user.withdrawAddress,
    createdAt: user.createdAt,
    emailVerified: user.emailVerified,
    hasGoogle: Boolean(user.googleId),
    hasPassword: Boolean(user.passwordHash),
    unreadCount: store ? unreadCount(store, user.id) : 0,
    wallets: publicWallets(user),
    txs,
  };
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
  while (findUserByLogin(store, candidate)) {
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

export async function sendVerifyMail(user: User) {
  const token = user.verifyToken || issueVerifyToken(user);
  const mail = await sendMail(
    user.email,
    "Verify your Huepot email",
    verifyEmailHtml(user.username, token),
  );
  return { ...mail, verifyUrl: verifyUrl(token) };
}

function newUser(partial: Omit<User, "wallets" | "balance" | "withdrawAddress" | "createdAt"> & Partial<User>): User {
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
  };
  ensureUserWallets(user);
  return user;
}

export function signup(
  store: StoreData,
  input: { email: string; username: string; password: string },
) {
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
  return { session: createSession(store, user.id), user };
}

export function signin(
  store: StoreData,
  input: { login: string; password: string },
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
  return createSession(store, user.id);
}

export function loginWithGoogle(
  store: StoreData,
  profile: { googleId: string; email: string; emailVerified: boolean; name: string },
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

  return createSession(store, user.id);
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

export function createSession(store: StoreData, userId: string) {
  pruneSessions(store);
  const token = newSessionToken();
  store.sessions[token] = {
    token,
    userId,
    expiresAt: nowMs() + SESSION_MS,
  };
  return { token, userId, maxAge: SESSION_MS / 1000 };
}

export function createOAuthState(store: StoreData) {
  pruneSessions(store);
  const state = randomBytes(16).toString("hex");
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
  return withStore((store) => {
    const user = userFromToken(store, token);
    if (!user) return null;
    ensureUserWallets(user);
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

export function depositToNetwork(
  store: StoreData,
  user: User,
  amount: number,
  networkId: string,
) {
  if (!isNetworkId(networkId)) {
    throw new Error("Pick a deposit network.");
  }
  if (!Number.isFinite(amount) || amount < MIN_DEPOSIT) {
    throw new Error(`Minimum deposit is ${MIN_DEPOSIT} USDT.`);
  }
  const network = networkById(networkId);
  const credit = Math.round(amount * 100) / 100;
  user.balance = Math.round((user.balance + credit) * 100) / 100;
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
    body: `${credit.toFixed(2)} USDT via ${network.standard} on ${network.name}.`,
    href: "/invest",
  });
}

export function withdrawFromNetwork(
  store: StoreData,
  user: User,
  amount: number,
  networkId: string,
  address: string,
) {
  if (!isNetworkId(networkId)) {
    throw new Error("Pick a withdraw network.");
  }
  const network = networkById(networkId);
  const cleaned = address.trim();
  if (!validateAddress(network.family, cleaned)) {
    throw new Error(`Enter a valid ${network.name} address.`);
  }
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAW) {
    throw new Error(`Minimum withdraw is ${MIN_WITHDRAW} USDT.`);
  }
  const debit = Math.round(amount * 100) / 100;
  if (debit > user.balance) {
    throw new Error("Not enough balance to withdraw.");
  }
  user.balance = Math.round((user.balance - debit) * 100) / 100;
  user.withdrawAddress = cleaned;
  store.txs.unshift({
    id: crypto.randomUUID(),
    playerId: user.id,
    type: "withdraw",
    amount: debit,
    createdAt: nowMs(),
    note: `To ${network.name} ${cleaned.slice(0, 6)}…${cleaned.slice(-4)} (demo)`,
  });
  store.txs = store.txs.slice(0, 400);
  notify(store, user.id, {
    kind: "withdraw",
    title: "Withdraw sent",
    body: `${debit.toFixed(2)} USDT to ${network.name}.`,
    href: "/withdraw",
  });
}
