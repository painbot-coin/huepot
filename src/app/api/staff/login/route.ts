import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { writeStaffLog } from "@/lib/staff-log";
import { loginStaff } from "@/lib/staff-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      secret?: string;
      name?: string;
    };
    const session = await loginStaff(request, body.secret ?? "", body.name ?? "staff");
    await writeStaffLog(session, "login", session.operator, "Staff desk opened");
    return NextResponse.json({
      ok: true,
      operator: session.operator,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    return jsonError(error);
  }
}
