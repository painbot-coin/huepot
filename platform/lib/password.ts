import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const have = Buffer.from(hash, "hex");
  if (have.length !== next.length) return false;
  return timingSafeEqual(have, next);
}

export function newId() {
  return randomBytes(8).toString("hex");
}

export function usernameOf(raw: string) {
  const name = raw.trim().toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(name) ? name : "";
}

export function money(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}
