import { NextResponse } from "next/server";
import { getSessionToken, requireUser, requireVerified } from "@/lib/auth";
import { postRoomChat } from "@/lib/game";
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
    const body = (await request.json()) as { text?: string };
    const state = await withStore((store) => {
      const user = requireUser(store, token);
      requireVerified(user);
      return postRoomChat(store, slug, user.id, body.text ?? "");
    });
    return NextResponse.json(state);
  } catch (error) {
    return jsonError(error);
  }
}
