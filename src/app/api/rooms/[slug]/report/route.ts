import { NextResponse } from "next/server";
import { getSessionToken, requireUser, requireVerified } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { insertReport, reportChat } from "@/lib/reports";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const token = await getSessionToken();
    const body = (await request.json()) as { eventId?: string };
    const row = await withStore((store) => {
      const user = requireUser(store, token);
      requireVerified(user);
      return reportChat(store, slug, user.id, body.eventId ?? "");
    });
    await insertReport(row);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}