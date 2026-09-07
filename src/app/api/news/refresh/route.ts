import { NextResponse } from "next/server";
import { adminSecret } from "@/lib/config";
import { jsonError } from "@/lib/http";
import { fetchNewsOnce } from "@/lib/news";
import { currentStaff, matchesAdminSecret } from "@/lib/staff-auth";

export const runtime = "nodejs";

/**
 * Pulls the feeds now instead of waiting for the timer. Staff or the admin
 * secret only — it makes outbound requests, so it is not something a visitor
 * should be able to trigger.
 */
export async function POST(request: Request) {
  try {
    const staff = await currentStaff(request).catch(() => null);
    const header = request.headers.get("x-admin-secret") ?? "";
    const allowed =
      Boolean(staff) ||
      matchesAdminSecret(header) ||
      // With no secret configured this is a local machine, not a house.
      (!adminSecret() && process.env.NODE_ENV !== "production");
    if (!allowed) {
      const error = new Error("Staff only.") as Error & { status?: number };
      error.status = 401;
      throw error;
    }
    return NextResponse.json({ sources: await fetchNewsOnce() });
  } catch (error) {
    return jsonError(error);
  }
}
