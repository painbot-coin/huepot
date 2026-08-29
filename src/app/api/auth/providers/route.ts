import { NextResponse } from "next/server";
import { chainStatus } from "@/lib/chain";
import {
  demoMoneyEnabled,
  googleConfigured,
  liveWithdrawalsEnabled,
  mailConfigured,
  productMode,
  withdrawSendEnabled,
} from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    google: googleConfigured(),
    mail: mailConfigured(),
    product: productMode(),
    demoMoney: demoMoneyEnabled(),
    liveWithdrawals: liveWithdrawalsEnabled(),
    withdrawSend: withdrawSendEnabled(),
    chain: chainStatus(),
  });
}
