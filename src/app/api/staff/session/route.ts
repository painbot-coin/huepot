import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { currentStaff } from "@/lib/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await currentStaff(request);
    if (!actor) {
      return NextResponse.json({ signedIn: false });
    }
    return NextResponse.json({
      signedIn: true,
      operator: actor.operator,
      ip: actor.ip,
    });
  } catch (error) {
    return jsonError(error);
  }
}
