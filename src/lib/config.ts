export const CLICK_PRICE = 1;
export const ROUND_SECONDS = 60;
export const REVEAL_SECONDS = 8;
export const FOG_SECONDS = 12;
export const MIN_DEPOSIT = 10;
export const MIN_WITHDRAW = 5;
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

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

export function mailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}
