export const CLICK_PRICE = 1;
export const ROUND_SECONDS = 60;
export const REVEAL_SECONDS = 8;
export const MIN_DEPOSIT = 10;
export const MIN_WITHDRAW = 5;
export const MAX_WITHDRAW = 2_000;
export const MAX_DAILY_WITHDRAW = 5_000;
export const LIVE_CHAIN_ID = "bsc" as const;
export const LIVE_USDT = "0x55d398326f99059fF775485246999027B3197955";
export const LIVE_USDT_DECIMALS = 18;
export const MIN_BUTTONS = 2;
export const MAX_BUTTONS = 8;
export const MIN_CLICK_PRICE = 0.1;
export const MAX_CLICK_PRICE = 50;
export const MIN_ROUND_SECONDS = 15;
export const MAX_ROUND_SECONDS = 180;
export const MAX_CUSTOM_ROOMS = 40;
export const MAX_ROOM_NAME = 28;
export const MAX_CHAT = 240;
export const MIN_LIVE_MINUTES = 10;
export const MAX_LIVE_MINUTES = 1440;
export const LIVE_MINUTE_OPTIONS = [10, 30, 60, 180, 360, 720, 1440] as const;
export const FOG_SECONDS = 12;
export const SUPPORT_EMAIL = "support@huepot.net";
export const INVITE_RAKE_SHARE_BPS = 2_000;
export const INVITE_DAILY_CAP = 10;
export const CLASSIC_HOUR_UTC = 20;
export const FOG_CUP_WEEKDAY = 0;
export const FOG_CUP_HOUR_UTC = 21;

export function appUrl() {
  const raw = (process.env.APP_URL || "").replace(/\/$/, "");
  if (raw) return raw;
  if (productMode()) return "https://huepot.net";
  return "http://localhost:3000";
}

export function productMode() {
  if (process.env.PRODUCT_MODE === "0") return false;
  if (process.env.PRODUCT_MODE === "1") return true;
  return process.env.NODE_ENV === "production";
}

export function demoMoneyEnabled() {
  if (process.env.ALLOW_DEMO_MONEY === "1") return !productMode();
  if (process.env.ALLOW_DEMO_MONEY === "0") return false;
  return !productMode();
}

export function cookieSecure() {
  return appUrl().startsWith("https://");
}

export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

export function chainRpcUrl() {
  if (process.env.BSC_RPC_URL) return process.env.BSC_RPC_URL;
  if (process.env.CHAIN_WATCH === "1" || productMode()) {
    return "https://bsc-dataseed.binance.org";
  }
  return "";
}

export function chainWatchEnabled() {
  return Boolean(chainRpcUrl());
}

export function chainConfirms() {
  const value = Number(process.env.USDT_CONFIRMS ?? 12);
  return Number.isFinite(value) ? Math.max(3, Math.min(64, Math.floor(value))) : 12;
}

export function adminSecret() {
  return process.env.ADMIN_SECRET || process.env.CHAIN_SECRET || "";
}

export function liveWithdrawalsEnabled() {
  return productMode() || !demoMoneyEnabled() || chainWatchEnabled();
}

export function withdrawKey() {
  const raw = (process.env.WITHDRAW_KEY ?? "").trim();
  if (!raw) return "";
  return raw.startsWith("0x") ? raw : `0x${raw}`;
}

export function withdrawSendEnabled() {
  return Boolean(withdrawKey() && chainRpcUrl());
}
