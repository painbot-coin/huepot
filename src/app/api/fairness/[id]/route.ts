import { NextResponse } from "next/server";
import { verifySettledRound } from "@/lib/fairness";
import { getSettledRound } from "@/lib/fairness-db";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const round = await getSettledRound(id);
    if (!round) {
      return NextResponse.json({ error: "That round is not on the sheet." }, { status: 404 });
    }
    return NextResponse.json({ round, check: verifySettledRound(round) });
  } catch (error) {
    return jsonError(error);
  }
}
