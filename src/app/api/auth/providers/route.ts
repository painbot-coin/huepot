import { NextResponse } from "next/server";
import { googleConfigured, mailConfigured } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    google: googleConfigured(),
    mail: mailConfigured(),
  });
}
