import { NextResponse } from "next/server";
import { chainStatus, startChainWatcher } from "@/lib/chain";

export const runtime = "nodejs";

export async function GET() {
  startChainWatcher();
  return NextResponse.json(chainStatus());
}
