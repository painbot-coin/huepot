import { NextResponse } from "next/server";
import { getSessionToken, requireUser, requireVerified, userFromToken } from "@/lib/auth";
import { getLobbyState, openCustomRoom } from "@/lib/game";
import { jsonError } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getSessionToken();
    const state = await withStore((store) => {
      const user = userFromToken(store, token);
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
      name?: string;
      buttonCount?: number;
      clickPrice?: number;
      roundSeconds?: number;
      liveMinutes?: number;
      fog?: boolean;
      fogSeconds?: number | null;
    };
    const state = await withStore((store) => {
      const user = requireUser(store, token);
      requireVerified(user);
      return openCustomRoom(store, user.id, body);
    });
    return NextResponse.json(state);
  } catch (error) {
    return jsonError(error);
  }
}
