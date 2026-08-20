import { NextResponse } from "next/server";
import {
  createSession,
  getSessionToken,
  setSessionCookie,
  verifyEmailToken,
} from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const cookie = await getSessionToken();
    const session = await withStore((store) => {
      const user = verifyEmailToken(store, body.token ?? "");
      if (cookie && store.sessions[cookie]) return null;
      return createSession(store, user.id);
    });
    if (session) await setSessionCookie(session.token, session.maxAge);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
