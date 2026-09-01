import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { withStoreRead } from "@/lib/store";
import { listPublicTakes } from "@/lib/takes";

export const runtime = "nodejs";

export async function GET() {
  try {
    const takes = await withStoreRead((store) => listPublicTakes(store, 6));
    return NextResponse.json({ takes });
  } catch (error) {
    return jsonError(error);
  }
}
