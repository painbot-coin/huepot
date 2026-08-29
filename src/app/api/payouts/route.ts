import { NextResponse } from "next/server";
import { listPublicPayouts } from "@/lib/chain";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const payouts = await listPublicPayouts(8);
    return NextResponse.json({ payouts });
  } catch (error) {
    return jsonError(error);
  }
}
