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
  const ageConfirmed = new URL(request.url).searchParams.get("age") === "1";
  const state = await withStore((store) => createOAuthState(store, ageConfirmed));
  return NextResponse.redirect(googleAuthUrl(state));
}
