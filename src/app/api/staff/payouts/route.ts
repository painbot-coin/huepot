import { writeStaffLog } from "@/lib/staff-log";
import { requireStaff } from "@/lib/staff-auth";
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
    const actor = await requireStaff(request);
    const withdrawals = await listWithdrawals();
    return NextResponse.json({
      withdrawals,
      canSend: withdrawSendEnabled(),
      treasury: await houseWalletStatus(),
      you: { operator: actor.operator, ip: actor.ip },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireStaff(request);
    const body = (await request.json()) as { id?: string; action?: string };
    if (!body.id || (body.action !== "paid" && body.action !== "rejected" && body.action !== "send")) {
      throw new Error("Pick a payout and an action.");
    }
    if (body.action === "send") {
      await sendQueuedWithdrawal(body.id);
    } else {
      await resolveWithdrawal(body.id, body.action);
    }
    await writeStaffLog(
      actor,
      body.action,
      body.id,
      body.action === "send" ? "On-chain USDT send" : body.action === "paid" ? "Marked paid" : "Rejected and refunded",
    );
    return NextResponse.json({
      withdrawals: await listWithdrawals(),
      canSend: withdrawSendEnabled(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
