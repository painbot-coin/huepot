import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { withStoreRead } from "@/lib/store";
import { listPublicTakes, liveTakes } from "@/lib/takes";

export const runtime = "nodejs";

export async function GET() {
  try {
    const live = await withStoreRead((store) => liveTakes(store));
    const takes = await listPublicTakes(live, 6);
    return NextResponse.json({ takes });
  } catch (error) {
    return jsonError(error);
  }
}
