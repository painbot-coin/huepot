import { NextResponse } from "next/server";
import { setSessionCookie, signin } from "@/lib/auth";
import { jsonError, requestAgent } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      login?: string;
      password?: string;
    };
    const session = await withStore((store) =>
      signin(
        store,
        {
          login: body.login ?? "",
          password: body.password ?? "",
        },
        requestAgent(request),
      ),
    );
    await setSessionCookie(session.token, session.maxAge);
    if (session.hadOtherSessions && session.email) {
      const { sendMail, securityEmailHtml } = await import("@/lib/mail");
      void sendMail(
        session.email,
        "New Huepot sign-in",
        securityEmailHtml(session.username, "signin", requestAgent(request).slice(0, 120)),
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
