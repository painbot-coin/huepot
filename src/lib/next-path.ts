/**
 * A path the gate may send someone back to after Google.
 *
 * Only a same-origin house path. Protocol-relative URLs, the API, and the
 * gate itself are refused so a crafted `next` cannot walk a player off
 * the house or loop the sign-in.
 */
export function safeNext(raw: string) {
  const path = (raw ?? "").trim();
  if (path.length < 2 || path.length > 200) return "";
  if (path[0] !== "/" || path[1] === "/") return "";
  if (path.includes("\\") || path.includes("://")) return "";
  if (path.startsWith("/api/") || path.startsWith("/signin")) return "";
  if (/[<>"']/.test(path)) return "";
  return path;
}
