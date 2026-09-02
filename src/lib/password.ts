import { randomBytes } from "crypto";

export function newSessionToken() {
  return randomBytes(32).toString("hex");
}
