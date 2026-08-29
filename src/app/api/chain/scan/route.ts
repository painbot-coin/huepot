import { NextResponse } from "next/server";
import { scanChain, startChainWatcher } from "@/lib/chain";
import { adminSecret, chainWatchEnabled } from "@/lib/config";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

function allowScan(request: Request) {
  const secret = adminSecret();
  const header = request.headers.get("x-admin-secret") ?? "";
  const url = new URL(request.url);
  const query = url.searchParams.get("secret") ?? "";
  if (!secret) return process.env.NODE_ENV !== "production";
  return header === secret || query === secret;
}

export async function POST(request: Request) {
  try {
    if (!chainWatchEnabled()) {
      return NextResponse.json(
        { error: "Set BSC_RPC_URL or CHAIN_WATCH=1 to watch deposits." },
        { status: 400 },
      );
    }
    if (!allowScan(request)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    startChainWatcher();
    const status = await scanChain();
    return NextResponse.json(status);
  } catch (error) {
    return jsonError(error);
  }
}
