const ONLINE_MS = 60_000;
const lastSeen = new Map<string, number>();

export function touchPresence(userId: string, at = Date.now()) {
  lastSeen.set(userId, at);
}

export function presenceAt(userId: string) {
  return lastSeen.get(userId) ?? null;
}

export function isOnline(userId: string, at = Date.now()) {
  const seen = lastSeen.get(userId);
  return Boolean(seen && at - seen < ONLINE_MS);
}
