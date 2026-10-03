import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  closeAccount,
  getSessionToken,
  requireUser,
} from "@/lib/auth";
import { hasOpenCashOut } from "@/lib/chain";
import { jsonError } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const body = (await request.json().catch(() => ({}))) as { confirm?: string };
    await withStore(async (store) => {
      const user = requireUser(store, token);
      if (await hasOpenCashOut(user.id)) {
        const error = new Error("A cash-out is still leaving. Wait for it, or ask staff to return it first.");
        (error as Error & { status?: number }).status = 400;
        throw error;
      }
      closeAccount(store, user, body.confirm ?? "");
    });
    // Every session for the account is already gone; drop the cookie too so
    // the browser is not left holding a token to nothing.
    await clearSessionCookie();
    return NextResponse.json({ closed: true });
  } catch (error) {
    return jsonError(error);
  }
}
