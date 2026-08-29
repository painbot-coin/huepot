import { NextResponse } from "next/server";
import {
  depositToNetwork,
  getSessionToken,
  requireUser,
  requireVerified,
  userFromToken,
} from "@/lib/auth";
import { pendingDepositsForUser } from "@/lib/chain";
import { getGameState } from "@/lib/game";
import { jsonError } from "@/lib/http";
import { withStore, withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getSessionToken();
    const userId = await withStoreRead((store) => {
      const user = userFromToken(store, token);
      if (!user) {
        const error = new Error("Sign in to continue.");
        (error as Error & { status?: number }).status = 401;
        throw error;
      }
      return user.id;
    });
    const pending = await pendingDepositsForUser(userId);
    return NextResponse.json({ pending });
  } catch (error) {
    return jsonError(error);
  }
}

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
