import { NextResponse } from "next/server";
import { getSessionToken, userFromToken } from "@/lib/auth";
import { ensureSitChips } from "@/lib/bonus";
import { getRoomState } from "@/lib/game";
import { jsonError } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const token = await getSessionToken();
    const state = await withStore(async (store) => {
      const user = userFromToken(store, token);
      if (user) await ensureSitChips(store, user);
      return getRoomState(store, slug, user?.id ?? null);
    });
    return NextResponse.json(state);
  } catch (error) {
    return jsonError(error);
  }
}
