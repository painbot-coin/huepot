/** A dedicated BSC URL that 401s must not freeze the watcher. */
export const PUBLIC_BSC_SEEDS = [
  "https://bsc-rpc.publicnode.com",
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
];

export function isDeadDedicatedRpc(error: unknown) {
  const text = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    text.includes("401") ||
    text.includes("unauthorized") ||
    text.includes("403") ||
    text.includes("forbidden") ||
    text.includes("invalid api key") ||
    text.includes("api key is")
  );
}

export function pickWatchRpcUrl(
  dedicated: string,
  abandoned: boolean,
  seedIndex: number,
) {
  const url = dedicated.trim();
  if (url && !abandoned) return url;
  return PUBLIC_BSC_SEEDS[Math.abs(seedIndex) % PUBLIC_BSC_SEEDS.length];
}

export function deadRpcNotice() {
  return "Dedicated BSC RPC refused. Watching on a public seed.";
}

export function rateLimitNotice() {
  return "Public RPC is slow. Still watching; credits can lag.";
}

export function isRpcSlow(error: unknown) {
  const text = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    text.includes("limit exceeded") ||
    text.includes("-32005") ||
    text.includes("rate limit") ||
    text.includes("too many") ||
    text.includes("429") ||
    text.includes("timed out")
  );
}

/** A public seed 403/archive must rotate, not look like the dedicated URL died. */
export function isSeedRefusal(error: unknown) {
  const text = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    isRpcSlow(error) ||
    isDeadDedicatedRpc(error) ||
    text.includes("archive") ||
    text.includes("personal token")
  );
}

export function skipArchiveNotice() {
  return "Public seed cannot read old blocks. Watching recent deposits.";
}

/** Free public nodes refuse archive logs. Skip the gap so new credits can land. */
export function publicCatchUpFrom(saved: number, safeHead: number, lookback: number) {
  if (safeHead <= 0) return saved > 0 ? saved + 1 : 0;
  const recent = Math.max(0, safeHead - lookback);
  if (saved <= 0) return recent;
  if (saved < recent) return recent;
  return saved + 1;
}

/** Head is known but the log cursor is behind — deposits may still be catching up. */
export function isCatchingUp(head: number, scanned: number) {
  if (head <= 0) return false;
  if (scanned <= 0) return true;
  return head - scanned > 200;
}
