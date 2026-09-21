import { NextResponse } from "next/server";
import { chainStatus } from "@/lib/chain";
import {
  demoMoneyEnabled,
  googleConfigured,
  liveWithdrawalsEnabled,
  productMode,
  withdrawSendEnabled,
} from "@/lib/config";
import { emailConfigured } from "@/lib/email";
import { hueConfigured } from "@/lib/hue-claim";
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
    // Visible so it is obvious whether a player can be reached off-site at all,
    // rather than something discovered one queued withdrawal later.
    email: emailConfigured(),
    hue: hueConfigured(),
    chain: chainStatus(),
  });
}
