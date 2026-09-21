/**
 * Claiming standing HUE onto BSC testnet.
 *
 * Off-chain HUE is derived from play. A claim pays unpaid standing from a
 * treasury balance of the same token. It is not USDT, it has no price, and it
 * cannot be withdrawn as cash. This file is the arithmetic only — queue and
 * send live elsewhere so a hung transfer cannot freeze the USDT watch.
 *
 * Testnet only. Mainnet is a different decision.
 */

export const HUE_DECIMALS = 18;
export const HUE_TESTNET_CHAIN_ID = 97;
export const HUE_UNITS = 10n ** BigInt(HUE_DECIMALS);

export const HUE_CLAIM_OPEN = ["queued", "sending", "paid"] as const;

export type HueClaimStatus = "queued" | "sending" | "paid" | "rejected";

export type HueClaimMark = {
  amount: number;
  status: string;
};

export type HueClaim = {
  id: string;
  userId: string;
  address: string;
  amount: number;
  status: HueClaimStatus;
  createdAt: number;
  resolvedAt: number | null;
  note: string;
  txHash: string;
  username?: string;
};

function num(value: unknown) {
  if (value == null) return 0;
  return Number(value) || 0;
}

export function floorHue(coin: number) {
  return Math.max(0, Math.floor(num(coin)));
}

export function countsTowardSent(status: string) {
  return (HUE_CLAIM_OPEN as readonly string[]).includes(status);
}

export function sentHue(claims: HueClaimMark[]) {
  return claims.reduce((sum, row) => {
    if (!countsTowardSent(row.status)) return sum;
    return sum + floorHue(row.amount);
  }, 0);
}

export function claimableHue(coin: number, claims: HueClaimMark[]) {
  return Math.max(0, floorHue(coin) - sentHue(claims));
}

export function hueToBaseUnits(hue: number) {
  return BigInt(floorHue(hue)) * HUE_UNITS;
}

export function isHueAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function hueExplorerTx(hash: string) {
  const id = hash.trim();
  if (!id) return "";
  return `https://testnet.bscscan.com/tx/${id}`;
}

export function hueToken() {
  const raw = (process.env.HUE_TOKEN ?? "").trim();
  return isHueAddress(raw) ? raw : "";
}

export function hueHotKey() {
  const raw = (process.env.HUE_HOT_KEY ?? "").trim();
  if (!raw) return "";
  return raw.startsWith("0x") ? raw : `0x${raw}`;
}

export function hueChainId() {
  const value = Number(process.env.HUE_CHAIN_ID ?? HUE_TESTNET_CHAIN_ID);
  return Number.isFinite(value) ? Math.floor(value) : 0;
}

export function hueRpcUrl() {
  return (process.env.HUE_RPC_URL ?? "").trim() || "https://bsc-testnet-rpc.publicnode.com";
}

/** Inert without a testnet token and a hot key. Mainnet env is treated as off. */
export function hueConfigured() {
  return Boolean(hueToken() && hueHotKey() && hueChainId() === HUE_TESTNET_CHAIN_ID);
}
