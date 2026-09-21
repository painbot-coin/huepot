import { NextResponse } from "next/server";
import { getSessionToken, requireUser, requireVerified } from "@/lib/auth";
import { hueConfigured } from "@/lib/hue-claim";
import { hueClaimPack, queueHueClaim, sendQueuedHueClaim } from "@/lib/hue-send";
import { jsonError } from "@/lib/http";
import { withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

function publicHueError(error: unknown) {
  const raw = error instanceof Error ? error.message : "House could not send HUE yet.";
  if (/treasury is short|needs testnet BNB/i.test(raw)) {
    return "House is short of testnet HUE. Your claim is queued.";
  }
  if (/already sending/i.test(raw)) return "";
  if (/not on|testnet only/i.test(raw)) return raw;
  if (/more HUE|No HUE|Paste a BNB/i.test(raw)) return raw;
  return "House could not send HUE yet. Your claim is queued and will retry.";
}

export async function GET() {
  try {
    const token = await getSessionToken();
    const userId = await withStoreRead((store) => {
      const user = requireUser(store, token);
      requireVerified(user);
      return user.id;
    });
    return NextResponse.json(await hueClaimPack(userId));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const body = (await request.json()) as { address?: string; amount?: number };
    const userId = await withStoreRead((store) => {
      const user = requireUser(store, token);
      requireVerified(user);
      return user.id;
    });
    const id = await queueHueClaim(userId, body.address ?? "", body.amount);
    let sendError = "";
    if (hueConfigured()) {
      try {
        await sendQueuedHueClaim(id);
      } catch (error) {
        sendError = publicHueError(error);
      }
    }
    const pack = await hueClaimPack(userId);
    return NextResponse.json(sendError ? { ...pack, sendError } : pack);
  } catch (error) {
    return jsonError(error);
  }
}
