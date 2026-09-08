import { NextResponse } from "next/server";
import { clientIpFromHeaders, isLoopback } from "@/lib/client-ip";

/**
 * A cap on how much of the house one caller can take.
 *
 * Lives in proxy.ts because Next 16 renamed the middleware convention; the
 * behaviour is the same, it runs before the route.
 *
 * Every request â€” reads included â€” goes through a single write queue, because
 * that queue is what makes concurrent clicks safe. Measured, the whole house
 * serves in the region of fifty requests a second. Without a cap, one client
 * in a loop is a house nobody else can play in, and no amount of tuning fixes
 * that because the lane is the design.
 *
 * A fixed window rather than anything cleverer: it is predictable, it costs
 * one integer per caller, and the number that matters is the ceiling.
 */

const WINDOW_MS = 60_000;
/** Five a second sustained. A player's client uses about five a minute. */
const MAX_PER_WINDOW = 300;

type Hit = { n: number; resetAt: number };
const hits = new Map<string, Hit>();

function tooMany(ip: string, now: number) {
  const hit = hits.get(ip);
  if (!hit || hit.resetAt <= now) {
    hits.set(ip, { n: 1, resetAt: now + WINDOW_MS });
    // Cheap sweep so a long run of one-off callers cannot grow the map without
    // bound. Only ever touches expired entries.
    if (hits.size > 5_000) {
      for (const [key, value] of hits) {
        if (value.resetAt <= now) hits.delete(key);
      }
    }
    return null;
  }
  hit.n += 1;
  return hit.n > MAX_PER_WINDOW ? hit : null;
}

export function proxy(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  // The operator's own traffic is not the thing being defended against, and
  // capping it would break health checks and the deploy verifier.
  if (isLoopback(ip)) return NextResponse.next();

  const now = Date.now();
  const over = tooMany(ip, now);
  if (!over) return NextResponse.next();

  const seconds = Math.max(1, Math.ceil((over.resetAt - now) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Slow down." },
    { status: 429, headers: { "retry-after": String(seconds) } },
  );
}

export const config = {
  // Only the API. Pages are cheap and mostly static; the queue is behind these.
  matcher: ["/api/:path*"],
};
