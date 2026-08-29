import { NextResponse } from "next/server";
import { listSettledRounds } from "@/lib/fairness-db";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") ?? "";
    const rounds = await listSettledRounds(slug || undefined);
    return NextResponse.json({ rounds });
  } catch (error) {
    return jsonError(error);
  }
}
