/**
 * Who is actually calling.
 *
 * No app imports, so this can be used from middleware as well as from routes.
 * The reasoning is the load-bearing part: the proxy overwrites `X-Real-IP`
 * with the address it is talking to, so it is the one value a caller cannot
 * choose. `X-Forwarded-For` is appended to whatever arrived, which leaves its
 * first entry in the caller's hands and its last as the hop the proxy added.
 */

function cleanIp(raw: string) {
  return raw.replace(/^::ffff:/, "") || "unknown";
}

export function clientIpFromHeaders(headers: Headers) {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return cleanIp(real);
  const chain = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return cleanIp(chain[chain.length - 1] ?? "");
}

/**
 * The box talking to itself. A visitor cannot claim this, because the proxy
 * replaces the header before the app sees it.
 *
 * An absent header reads as "unknown" and is deliberately *not* loopback. It
 * is not proof of anything, and treating it as trusted would mean a proxy that
 * stopped setting the header quietly removed every per-caller limit at once.
 * Unknown callers share one counted bucket instead.
 */
export function isLoopback(ip: string) {
  return ip === "127.0.0.1" || ip === "::1";
}
