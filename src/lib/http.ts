import { NextResponse } from "next/server";

export function requestAgent(request: Request) {
  return request.headers.get("user-agent") ?? "";
}

export function jsonError(error: unknown, fallback = "Request failed") {
  const message = error instanceof Error ? error.message : fallback;
  const status =
    error instanceof Error && "status" in error
      ? Number((error as Error & { status?: number }).status) || 400
      : 400;
  return NextResponse.json({ error: message }, { status });
}
