import { requireAdmin } from "@/lib/staff-auth";
import {
  houseWalletStatus,
  listWithdrawals,
  resolveWithdrawal,
  sendQueuedWithdrawal,
} from "@/lib/chain";
import { withdrawSendEnabled } from "@/lib/config";
import { jsonError } from "@/lib/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const withdrawals = await listWithdrawals();
    return NextResponse.json({
      withdrawals,
      canSend: withdrawSendEnabled(),
      treasury: await houseWalletStatus(),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const body = (await request.json()) as { id?: string; action?: string };
    if (!body.id || (body.action !== "paid" && body.action !== "rejected" && body.action !== "send")) {
      throw new Error("Pick a payout and an action.");
    }
    if (body.action === "send") {
      await sendQueuedWithdrawal(body.id);
    } else {
      await resolveWithdrawal(body.id, body.action);
    }
    return NextResponse.json({
      withdrawals: await listWithdrawals(),
      canSend: withdrawSendEnabled(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
