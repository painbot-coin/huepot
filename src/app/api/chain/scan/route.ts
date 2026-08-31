import { NextResponse } from "next/server";
import { scanChain, startChainWatcher } from "@/lib/chain";
import { adminSecret, chainWatchEnabled, productMode } from "@/lib/config";
import { jsonError } from "@/lib/http";
import { currentStaff, matchesAdminSecret, requestIp, staffIpAllowed } from "@/lib/staff-auth";

export const runtime = "nodejs";

async function allowScan(request: Request) {
  if (!staffIpAllowed(requestIp(request))) return false;
  if (await currentStaff(request)) return true;
  const header = request.headers.get("x-admin-secret") ?? "";
  if (matchesAdminSecret(header)) return true;
  if (adminSecret()) return false;
  return !productMode() && process.env.NODE_ENV !== "production";
}

export async function POST(request: Request) {
  try {
    if (!chainWatchEnabled()) {
      return NextResponse.json(
        { error: "Set BSC_RPC_URL or CHAIN_WATCH=1 to watch deposits." },
        { status: 400 },
      );
    }
    if (!(await allowScan(request))) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    startChainWatcher();
    const status = await scanChain();
    return NextResponse.json(status);
  } catch (error) {
    return jsonError(error);
  }
}
