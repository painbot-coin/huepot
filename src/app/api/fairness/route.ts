import { NextResponse } from "next/server";
import { countSettledRounds, listSettledRounds } from "@/lib/fairness-db";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") ?? "";
    // The ledger exists so a take can be checked. A round nobody clicked has
    // no payout math to check, and there are tens of thousands of them.
    const rounds = await listSettledRounds(slug || undefined, 40, "take");
    const settled = await countSettledRounds(slug || undefined);
    return NextResponse.json({ rounds, settled });
  } catch (error) {
    return jsonError(error);
  }
}
