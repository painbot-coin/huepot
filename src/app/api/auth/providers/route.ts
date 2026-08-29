import { NextResponse } from "next/server";
import { chainStatus } from "@/lib/chain";
import {
  demoMoneyEnabled,
  googleConfigured,
  liveWithdrawalsEnabled,
  productMode,
  withdrawSendEnabled,
} from "@/lib/config";
import { APP_VERSION } from "@/lib/version";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    version: APP_VERSION,
    google: googleConfigured(),
    product: productMode(),
    demoMoney: demoMoneyEnabled(),
    liveWithdrawals: liveWithdrawalsEnabled(),
    withdrawSend: withdrawSendEnabled(),
    chain: chainStatus(),
  });
}
