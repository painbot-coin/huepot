import { NextResponse } from "next/server";
import {
  getSessionToken,
  requireUser,
  requireVerified,
  withdrawFromNetwork,
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
      address?: string;
      networkId?: string;
    };
    const state = await withStore((store) => {
      const user = requireUser(store, token);
      requireVerified(user);
      withdrawFromNetwork(
        store,
        user,
        Number(body.amount),
        body.networkId ?? "",
        body.address ?? "",
      );
      return getGameState(store, user.id);
    });
    return NextResponse.json(state);
  } catch (error) {
    return jsonError(error);
  }
}
