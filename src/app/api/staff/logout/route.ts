import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { writeStaffLog } from "@/lib/staff-log";
import {
  clearStaffCookie,
  currentStaff,
  destroyStaffSession,
  getStaffToken,
} from "@/lib/staff-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actor = await currentStaff(request);
    const token = await getStaffToken();
    await destroyStaffSession(token);
    await clearStaffCookie();
    if (actor) await writeStaffLog(actor, "logout", actor.operator, "Staff desk closed");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
