export const CLICK_PRICE = 1;
export const ROUND_SECONDS = 60;
export const REVEAL_SECONDS = 8;
export const MIN_DEPOSIT = 10;
export const MIN_WITHDRAW = 5;

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
