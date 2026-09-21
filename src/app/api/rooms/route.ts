import { NextResponse } from "next/server";
import { getSessionToken, requireUser, requireVerified, userFromToken } from "@/lib/auth";
import { ensureSitChips } from "@/lib/bonus";
import { readyFriends } from "@/lib/friends";
import { getLobbyState, openAfterTakeRoom, openCustomRoom } from "@/lib/game";
import { jsonError } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getSessionToken();
    const state = await withStore(async (store) => {
      const user = userFromToken(store, token);
      if (user) await ensureSitChips(store, user);
      await readyFriends();
      return getLobbyState(store, user?.id ?? null);
    });
    return NextResponse.json(state);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const body = (await request.json()) as {
      afterTake?: boolean;
      name?: string;
      buttonCount?: number;
      clickPrice?: number;
      roundSeconds?: number;
      liveMinutes?: number;
      fog?: boolean;
      fogSeconds?: number | null;
    };
    const state = await withStore(async (store) => {
      const user = requireUser(store, token);
      requireVerified(user);
      if (body.afterTake) return openAfterTakeRoom(store, user.id);
      return openCustomRoom(store, user.id, body);
    });
    return NextResponse.json(state);
  } catch (error) {
    return jsonError(error);
  }
}
