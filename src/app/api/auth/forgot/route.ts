import { NextResponse } from "next/server";
import { requestPasswordReset, sendResetMail } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const user = await withStore((store) => requestPasswordReset(store, body.email ?? ""));
    if (!user) return NextResponse.json({ ok: true });
    const mail = await sendResetMail(user);
    return NextResponse.json({
      ok: true,
      resetUrl:
        mail.sent || process.env.NODE_ENV === "production" ? undefined : mail.resetUrl,
    });
  } catch (error) {
    return jsonError(error);
  }
}
