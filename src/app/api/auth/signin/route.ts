import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Use Google sign-in." },
    { status: 410 },
  );
}
