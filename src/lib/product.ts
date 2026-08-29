import { adminSecret, productMode } from "@/lib/config";

const DEV_WALLET = "huepot-dev-wallet-secret-change-me";

export function assertProductReady() {
  if (!productMode()) return;
  const wallet = process.env.WALLET_SECRET ?? "";
  if (!wallet) {
    throw new Error("Product mode needs WALLET_SECRET in .env.local.");
  }
  if (process.env.NODE_ENV === "production" && wallet === DEV_WALLET) {
    throw new Error("Change WALLET_SECRET before running Huepot in production.");
  }
  if (!adminSecret()) {
    throw new Error("Product mode needs ADMIN_SECRET for /staff.");
  }
}