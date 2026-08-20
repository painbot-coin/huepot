import { NextResponse } from "next/server";
import { getSessionToken, userFromToken } from "@/lib/auth";
import { getGameState } from "@/lib/game";
import { jsonError } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getSessionToken();
    const state = await withStore((store) => {
      const user = userFromToken(store, token);
      return getGameState(store, user?.id ?? null);
    });
    return NextResponse.json(state);
  } catch (error) {
    return jsonError(error);
  }
}
