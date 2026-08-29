/** Display helpers take USDT. Storage and game math use integer cents. */

export function toCents(value: number) {
  return Math.round(Number(value) * 100);
}

export function fromCents(cents: number) {
  return Math.round(Number(cents) || 0) / 100;
}

export function parseUsdtToCents(value: number) {
  const cents = toCents(value);
  if (!Number.isFinite(cents)) return NaN;
  return cents;
}

export function formatUsdt(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCents(cents: number) {
  return formatUsdt(fromCents(cents));
}

export function formatClock(ms: number) {
  const safe = Math.max(0, ms);
  const total = Math.ceil(safe / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Split `pot` cents across click shares. Leftover cents go in player-id order. */
export function splitCentsByClicks(
  pot: number,
  parts: { id: string; clicks: number }[],
  totalClicks: number,
) {
  const shares = new Map<string, number>();
  if (pot <= 0 || totalClicks <= 0) {
    for (const part of parts) shares.set(part.id, 0);
    return shares;
  }
  const base = Math.floor(pot / totalClicks);
  let rem = pot % totalClicks;
  const extra = new Map<string, number>();
  for (const part of [...parts].sort((a, b) => a.id.localeCompare(b.id))) {
    const take = Math.min(rem, part.clicks);
    extra.set(part.id, take);
    rem -= take;
  }
  for (const part of parts) {
    shares.set(part.id, part.clicks * base + (extra.get(part.id) ?? 0));
  }
  return shares;
}

export function rakeFromPot(potCents: number, bps: number) {
  if (potCents <= 0 || bps <= 0) return 0;
  return Math.floor((potCents * bps) / 10_000);
}

export function floorPayoutPerClick(clickPrice: number, losingPot: number, winningClicks: number) {
  if (winningClicks <= 0) return clickPrice;
  return clickPrice + Math.floor(losingPot / winningClicks);
}
