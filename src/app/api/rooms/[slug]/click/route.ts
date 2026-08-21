import { NextResponse } from "next/server";
import { getSessionToken, requireUser, requireVerified } from "@/lib/auth";
import { isColorId } from "@/lib/colors";
import { clickColor } from "@/lib/game";
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
    const body = (await request.json()) as { colorId?: string };
    const colorId = body.colorId;
    if (!colorId || !isColorId(colorId)) {
      return NextResponse.json({ error: "Pick a color." }, { status: 400 });
    }
    const state = await withStore((store) => {
      const user = requireUser(store, token);
      requireVerified(user);
      return clickColor(store, user.id, colorId, slug);
    });
    return NextResponse.json(state);
  } catch (error) {
    return jsonError(error);
  }
}
