import { randomBytes } from "node:crypto";

export function newId() {
  return randomBytes(8).toString("hex");
}

export function money(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
