import { NextResponse } from "next/server";
import {
  getSessionToken,
  requireUser,
  toPublicUser,
} from "@/lib/auth";
import { jsonError } from "@/lib/http";
import {
  setDailyLossCap,
  startCoolOff,
  startSelfExclude,
} from "@/lib/limits";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const body = (await request.json()) as {
      dailyLossCap?: number;
      coolOffHours?: number;
      selfExcludeDays?: number;
    };
    const user = await withStore((store) => {
      const current = requireUser(store, token);
      if (body.dailyLossCap != null) setDailyLossCap(current, Number(body.dailyLossCap));
      if (body.coolOffHours != null) startCoolOff(current, Number(body.coolOffHours));
      if (body.selfExcludeDays != null) startSelfExclude(current, Number(body.selfExcludeDays));
      return toPublicUser(current, store.txs.filter((tx) => tx.playerId === current.id).slice(0, 120), store);
    });
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
