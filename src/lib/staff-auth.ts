import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { adminSecret, cookieSecure } from "@/lib/config";
import { prisma } from "@/lib/db";

export const STAFF_COOKIE = "huepot_staff";
const SESSION_MS = 1000 * 60 * 60 * 4;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILS = 8;

export type StaffActor = {
  operator: string;
  ip: string;
};

type StaffSession = {
  token: string;
  operator: string;
  ip: string;
  createdAt: number;
  expiresAt: number;
};

const loginFails = new Map<string, { n: number; resetAt: number }>();
let tablesReady = false;

export function staffIps() {
  return (process.env.STAFF_IPS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function requestIp(request: Request) {
  return requestIpFromHeaders(request.headers);
}

export function requestIpFromHeaders(headers: Headers) {
  // The proxy overwrites X-Real-IP with the address it is actually talking to,
  // so it is the one value a caller cannot choose. X-Forwarded-For is appended
  // to whatever arrived, which leaves its first entry in the caller's hands and
  // its last entry as the hop the proxy added.
  const real = headers.get("x-real-ip")?.trim();
  if (real) return cleanIp(real);
  const chain = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return cleanIp(chain[chain.length - 1] ?? "");
}

function cleanIp(raw: string) {
  return raw.replace(/^::ffff:/, "") || "unknown";
}

export function staffIpAllowed(ip: string) {
  const allowed = staffIps();
  if (!allowed.length) return true;
  if (ip === "127.0.0.1" || ip === "::1") return true;
  return allowed.includes(ip);
}

export function assertStaffIp(request: Request) {
  const ip = requestIp(request);
  if (staffIpAllowed(ip)) return ip;
  const error = new Error("Staff is closed from this network.");
  (error as Error & { status?: number }).status = 403;
  throw error;
}

function cleanOperator(raw: string) {
  const name = raw.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20);
  return name.length >= 2 ? name : "staff";
}

function sameSecret(given: string, expected: string) {
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  if (!left.length || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function matchesAdminSecret(given: string) {
  const expected = adminSecret();
  return Boolean(expected && sameSecret(given, expected));
}

function noteLoginFail(ip: string) {
  const now = Date.now();
  const hit = loginFails.get(ip);
  if (!hit || hit.resetAt < now) {
    loginFails.set(ip, { n: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  hit.n += 1;
}

function loginBlocked(ip: string) {
  const hit = loginFails.get(ip);
  return Boolean(hit && hit.resetAt > Date.now() && hit.n >= LOGIN_MAX_FAILS);
}

export async function ensureStaffTables() {
  if (tablesReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS StaffSession (
      token TEXT PRIMARY KEY,
      operator TEXT NOT NULL,
      ip TEXT NOT NULL,
      createdAt BIGINT NOT NULL,
      expiresAt BIGINT NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS StaffLog (
      id TEXT PRIMARY KEY,
      at BIGINT NOT NULL,
      operator TEXT NOT NULL,
      ip TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      note TEXT NOT NULL
    )
  `);
  tablesReady = true;
}

async function pruneSessions() {
  await prisma.$executeRaw`DELETE FROM StaffSession WHERE expiresAt < ${Date.now()}`;
}

export async function createStaffSession(rawName: string, ip: string): Promise<StaffSession> {
  await ensureStaffTables();
  await pruneSessions();
  const token = createHash("sha256").update(randomBytes(32)).digest("hex");
  const now = Date.now();
  const session: StaffSession = {
    token,
    operator: cleanOperator(rawName),
    ip,
    createdAt: now,
    expiresAt: now + SESSION_MS,
  };
  await prisma.$executeRaw`
    INSERT INTO StaffSession (token, operator, ip, createdAt, expiresAt)
    VALUES (${session.token}, ${session.operator}, ${session.ip}, ${session.createdAt}, ${session.expiresAt})
  `;
  return session;
}

async function readSession(token: string | undefined) {
  if (!token) return null;
  await ensureStaffTables();
  const rows = await prisma.$queryRaw<StaffSession[]>`
    SELECT token, operator, ip, CAST(createdAt AS TEXT) as createdAt, CAST(expiresAt AS TEXT) as expiresAt
    FROM StaffSession WHERE token = ${token} LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const session: StaffSession = {
    token: row.token,
    operator: row.operator,
    ip: row.ip,
    createdAt: Number(row.createdAt),
    expiresAt: Number(row.expiresAt),
  };
  if (session.expiresAt < Date.now()) {
    await prisma.$executeRaw`DELETE FROM StaffSession WHERE token = ${token}`;
    return null;
  }
  return session;
}

export async function getStaffToken() {
  const jar = await cookies();
  return jar.get(STAFF_COOKIE)?.value;
}

export async function setStaffCookie(token: string) {
  const jar = await cookies();
  jar.set(STAFF_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: cookieSecure(),
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
}

export async function clearStaffCookie() {
  const jar = await cookies();
  jar.delete(STAFF_COOKIE);
}

export async function destroyStaffSession(token: string | undefined) {
  if (!token) return;
  await ensureStaffTables();
  await prisma.$executeRaw`DELETE FROM StaffSession WHERE token = ${token}`;
}

export async function loginStaff(request: Request, secret: string, name: string) {
  const ip = assertStaffIp(request);
  if (loginBlocked(ip)) {
    const error = new Error("Too many failed staff sign-ins. Wait 15 minutes.");
    (error as Error & { status?: number }).status = 429;
    throw error;
  }
  const expected = adminSecret();
  if (!expected) {
    const error = new Error("Set ADMIN_SECRET to open the staff console.");
    (error as Error & { status?: number }).status = 503;
    throw error;
  }
  if (!sameSecret(secret, expected)) {
    noteLoginFail(ip);
    const error = new Error("Wrong staff secret.");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
  loginFails.delete(ip);
  const session = await createStaffSession(name, ip);
  await setStaffCookie(session.token);
  return { operator: session.operator, ip, expiresAt: session.expiresAt };
}

export async function requireStaff(request: Request): Promise<StaffActor> {
  const ip = assertStaffIp(request);
  const session = await readSession(await getStaffToken());
  if (!session) {
    const error = new Error("Sign in to the staff desk.");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  if (session.ip !== "unknown" && session.ip !== ip) {
    const error = new Error("Staff session is tied to another network.");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
  return { operator: session.operator, ip };
}

export async function currentStaff(request: Request) {
  try {
    return await requireStaff(request);
  } catch {
    return null;
  }
}
