import { NextResponse } from "next/server";
import {
  depositToNetwork,
  getSessionToken,
  requireUser,
  requireVerified,
} from "@/lib/auth";
import { getGameState } from "@/lib/game";
import { jsonError } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const body = (await request.json()) as {
      amount?: number;
      networkId?: string;
    };
    const state = await withStore((store) => {
      const user = requireUser(store, token);
      requireVerified(user);
      depositToNetwork(store, user, Number(body.amount), body.networkId ?? "");
      return getGameState(store, user.id);
    });
    return NextResponse.json(state);
  } catch (error) {
    return jsonError(error);
  }
}
