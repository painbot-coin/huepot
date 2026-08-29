import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; password?: string };
    await withStore((store) => resetPassword(store, body.token ?? "", body.password ?? ""));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
