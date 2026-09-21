import { NextResponse } from "next/server";
import { loginWithGoogle, setSessionCookie, takeOAuthState } from "@/lib/auth";
import { appUrl } from "@/lib/config";
import { googleProfile } from "@/lib/google";
import { requestAgent } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const err = url.searchParams.get("error");
  if (err) {
    return NextResponse.redirect(`${appUrl()}/signin?error=google_denied`);
  }

  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  try {
    const profile = await googleProfile(code);
    let next = "";
    const session = await withStore((store) => {
      const oauth = takeOAuthState(store, state);
      next = oauth.next;
      return loginWithGoogle(
        store,
        profile,
        oauth.ageConfirmed,
        requestAgent(request),
        oauth.inviteCode,
      );
    });
    await setSessionCookie(session.token, session.maxAge);
    return NextResponse.redirect(`${appUrl()}${next || "/"}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google sign-in failed";
    return NextResponse.redirect(
      `${appUrl()}/signin?error=${encodeURIComponent(message)}`,
    );
  }
}
