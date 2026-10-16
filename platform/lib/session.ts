import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { readDb } from "./store";

const file = path.join(process.cwd(), "data", "secret");

function secret() {
  if (process.env.ATRIUM_SECRET) return process.env.ATRIUM_SECRET;
  try {
    return readFileSync(file, "utf8");
  } catch {
    const value = randomBytes(32).toString("hex");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, value);
    return value;
  }
}

function sign(id: string) {
  const mac = createHmac("sha256", secret()).update(id).digest("hex");
  return `${id}.${mac}`;
}

function readId(token: string) {
  const [id, mac] = token.split(".");
  if (!id || !mac) return "";
  const expect = createHmac("sha256", secret()).update(id).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "";
  return id;
}

export async function currentUser() {
  const jar = await cookies();
  const token = jar.get("atrium")?.value ?? "";
  const id = token ? readId(token) : "";
  if (!id) return null;
  return readDb().users.find((row) => row.id === id) ?? null;
}

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set("atrium", sign(userId), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete("atrium");
}
