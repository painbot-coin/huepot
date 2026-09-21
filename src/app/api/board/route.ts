import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { listHouseBoard } from "@/lib/record";

export const runtime = "nodejs";

export async function GET() {
  try {
    const seats = await listHouseBoard();
    return NextResponse.json({ seats });
  } catch (error) {
    return jsonError(error);
  }
}
