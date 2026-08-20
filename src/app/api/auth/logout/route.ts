import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  getSessionToken,
  signout,
} from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST() {
  try {
    const token = await getSessionToken();
    await withStore((store) => signout(store, token));
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
