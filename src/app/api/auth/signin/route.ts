import { NextResponse } from "next/server";
import { setSessionCookie, signin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      login?: string;
      password?: string;
    };
    const session = await withStore((store) =>
      signin(store, {
        login: body.login ?? "",
        password: body.password ?? "",
      }),
    );
    await setSessionCookie(session.token, session.maxAge);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
