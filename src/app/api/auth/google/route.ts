import { NextResponse } from "next/server";
import { createOAuthState } from "@/lib/auth";
import { appUrl, googleConfigured } from "@/lib/config";
import { googleAuthUrl } from "@/lib/google";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  if (!googleConfigured()) {
    return NextResponse.redirect(
      `${appUrl()}/signin?error=google_not_configured`,
    );
  }
  const state = await withStore((store) => createOAuthState(store));
  return NextResponse.redirect(googleAuthUrl(state));
}
