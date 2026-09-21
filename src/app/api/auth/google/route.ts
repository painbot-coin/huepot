import { NextResponse } from "next/server";
import { createOAuthState } from "@/lib/auth";
import { appUrl, googleConfigured } from "@/lib/config";
import { googleAuthUrl } from "@/lib/google";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(
      `${appUrl()}/signin?error=google_not_configured`,
    );
  }
  const url = new URL(request.url);
  const ageConfirmed = url.searchParams.get("age") === "1";
  const inviteCode = url.searchParams.get("ref") || cookieRef(request);
  const next = url.searchParams.get("next") ?? "";
  const state = await withStore((store) =>
    createOAuthState(store, ageConfirmed, inviteCode, next),
  );
  return NextResponse.redirect(googleAuthUrl(state));
}

function cookieRef(request: Request) {
  const match = request.headers.get("cookie")?.match(/(?:^|;\s*)huepot_ref=([^;]+)/);
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
