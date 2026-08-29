import { NextResponse } from "next/server";
import {
  getSessionToken,
  requireUser,
  requireVerified,
  withdrawFromNetwork,
} from "@/lib/auth";
import { dailyWithdrawTotal, insertWithdrawal } from "@/lib/chain";
import {
  LIVE_CHAIN_ID,
  MAX_DAILY_WITHDRAW,
  liveWithdrawalsEnabled,
} from "@/lib/config";
import { getGameState } from "@/lib/game";
import { jsonError } from "@/lib/http";
import { toCents } from "@/lib/money";
import { withStore, withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const body = (await request.json()) as {
      amount?: number;
      address?: string;
      networkId?: string;
    };
    const queued = liveWithdrawalsEnabled();
    const payoutId = queued ? crypto.randomUUID() : undefined;
    const amount = Number(body.amount);

    if (queued) {
      const userId = await withStoreRead((store) => {
        const user = requireUser(store, token);
        requireVerified(user);
        return user.id;
      });
      const spent = await dailyWithdrawTotal(userId);
      if (spent + toCents(amount) > toCents(MAX_DAILY_WITHDRAW)) {
        throw new Error(`Daily cash-out cap is ${MAX_DAILY_WITHDRAW} USDT.`);
      }
    }

    const packed = await withStore((store) => {
      const user = requireUser(store, token);
      requireVerified(user);
      const result = withdrawFromNetwork(
        store,
        user,
        amount,
        body.networkId ?? "",
        body.address ?? "",
        payoutId,
      );
      return { state: getGameState(store, user.id), userId: user.id, result };
    });

    if (queued && payoutId) {
      await insertWithdrawal({
        id: payoutId,
        userId: packed.userId,
        networkId: LIVE_CHAIN_ID,
        address: packed.result.address,
        amount: packed.result.amount,
        status: "queued",
        createdAt: Date.now(),
        note: "Queued for send",
      });
    }

    return NextResponse.json(packed.state);
  } catch (error) {
    return jsonError(error);
  }
}
