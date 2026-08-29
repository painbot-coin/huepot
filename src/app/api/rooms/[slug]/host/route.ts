import { NextResponse } from "next/server";
import { getSessionToken, requireUser, requireVerified } from "@/lib/auth";
import {
  hostCloseRoom,
  hostMutePlayer,
  hostRenameRoom,
  hostSetPaused,
  hostSetSlowMode,
} from "@/lib/game";
import { jsonError } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const token = await getSessionToken();
    const body = (await request.json()) as {
      action?: string;
      userId?: string;
      name?: string;
      paused?: boolean;
      slow?: boolean;
    };
    const result = await withStore((store) => {
      const user = requireUser(store, token);
      requireVerified(user);
      if (body.action === "close") return hostCloseRoom(store, slug, user.id);
      if (body.action === "mute" && body.userId) {
        return hostMutePlayer(store, slug, user.id, body.userId);
      }
      if (body.action === "rename") return hostRenameRoom(store, slug, user.id, body.name ?? "");
      if (body.action === "pause") return hostSetPaused(store, slug, user.id, body.paused !== false);
      if (body.action === "resume") return hostSetPaused(store, slug, user.id, false);
      if (body.action === "slow") return hostSetSlowMode(store, slug, user.id, body.slow !== false);
      throw new Error("Pick a host action.");
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
