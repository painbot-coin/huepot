import { NextResponse } from "next/server";
import { sendVerifyMail, setSessionCookie, signup } from "@/lib/auth";
import { jsonError, requestAgent } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      username?: string;
      password?: string;
      ageConfirmed?: boolean;
    };
    const agent = requestAgent(request);
    const result = await withStore((store) =>
      signup(
        store,
        {
          email: body.email ?? "",
          username: body.username ?? "",
          password: body.password ?? "",
          ageConfirmed: Boolean(body.ageConfirmed),
        },
        agent,
      ),
    );
    await setSessionCookie(result.session.token, result.session.maxAge);
    const mail = await sendVerifyMail(result.user);
    return NextResponse.json({
      ok: true,
      mailSent: mail.sent,
      verifyUrl: mail.sent ? undefined : mail.verifyUrl,
    });
  } catch (error) {
    return jsonError(error);
  }
}
