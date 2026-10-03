import { createHash, timingSafeEqual } from "node:crypto";
import { newId } from "@/lib/atrium/ids";

const PREFIX = "sha256:";

const shown = new Map<string, { plain: string; at: number }>();
const SHOWN_MS = 60_000;

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function hashKey(plain: string) {
  return `${PREFIX}${digest(plain).toString("hex")}`;
}

/** A stored key may still be the old plaintext. Both forms match the same bearer. */
export function keyMatches(stored: string, presented: string) {
  const plain = presented.trim();
  if (!stored || !plain) return false;
  const left = stored.startsWith(PREFIX) ? Buffer.from(stored.slice(PREFIX.length), "hex") : digest(stored);
  const right = digest(plain);
  if (left.length !== right.length || left.length !== 32) return false;
  return timingSafeEqual(left, right);
}

/** Turn a plaintext key into a hash. A hash is left as it is. */
export function sealStored(stored: string) {
  if (!stored || stored.startsWith(PREFIX)) return stored;
  return hashKey(stored);
}

export function issueKey() {
  const plain = newId() + newId();
  return { plain, stored: hashKey(plain) };
}

export function holdKey(userId: string, plain: string) {
  shown.set(userId, { plain, at: Date.now() });
}

export function peekKey(userId: string, at = Date.now()) {
  const row = shown.get(userId);
  if (!row) return "";
  if (at - row.at > SHOWN_MS) {
    shown.delete(userId);
    return "";
  }
  return row.plain;
}

export function seatForKey<T extends { apiKey: string }>(users: T[], presented: string) {
  const key = presented.trim();
  if (!key) return null;
  let found: T | null = null;
  for (const row of users) {
    if (row.apiKey && keyMatches(row.apiKey, key)) found = row;
  }
  return found;
}
