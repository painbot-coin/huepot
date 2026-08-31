import { NextResponse } from "next/server";
import {
  getSessionToken,
  requireUser,
  requireVerified,
  withdrawFromNetwork,
} from "@/lib/auth";
import { dailyWithdrawTotal, deleteWithdrawal, insertWithdrawal, listWithdrawalsForUser } from "@/lib/chain";
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

export async function GET() {
  try {
    const token = await getSessionToken();
    const userId = await withStoreRead((store) => {
      const user = requireUser(store, token);
      requireVerified(user);
      return user.id;
    });
    const withdrawals = await listWithdrawalsForUser(userId);
    return NextResponse.json({ withdrawals });
  } catch (error) {
    return jsonError(error);
  }
}

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

    let queuedId = "";
    try {
      const packed = await withStore(async (store) => {
        const user = requireUser(store, token);
        requireVerified(user);
        if (queued) {
          const spent = await dailyWithdrawTotal(user.id);
          if (spent + toCents(amount) > toCents(MAX_DAILY_WITHDRAW)) {
            throw new Error(`Daily cash-out cap is ${MAX_DAILY_WITHDRAW} USDT.`);
          }
        }
        const result = withdrawFromNetwork(
          store,
          user,
          amount,
          body.networkId ?? "",
          body.address ?? "",
          payoutId,
        );
        if (queued && payoutId) {
          queuedId = payoutId;
          await insertWithdrawal({
            id: payoutId,
            userId: user.id,
            networkId: LIVE_CHAIN_ID,
            address: result.address,
            amount: result.amount,
            status: "queued",
            createdAt: Date.now(),
            note: "Queued for send",
          });
        }
        return { state: getGameState(store, user.id), result };
      });
      return NextResponse.json(packed.state);
    } catch (error) {
      if (queuedId) {
        await deleteWithdrawal(queuedId).catch(() => undefined);
      }
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}
