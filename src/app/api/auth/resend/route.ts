import { NextResponse } from "next/server";
import {
  getSessionToken,
  prepareResend,
  requireUser,
  sendVerifyMail,
} from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST() {
  try {
    const token = await getSessionToken();
    const user = await withStore((store) => {
      const found = requireUser(store, token);
      return prepareResend(store, found);
    });
    const mail = await sendVerifyMail(user);
    return NextResponse.json({
      ok: true,
      mailSent: mail.sent,
      verifyUrl: mail.sent ? undefined : mail.verifyUrl,
    });
  } catch (error) {
    return jsonError(error);
  }
}
