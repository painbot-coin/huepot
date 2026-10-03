import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionToken, userFromToken } from "@/lib/auth";
import { clientIpFromHeaders, isLoopback } from "@/lib/client-ip";
import { cookieSecure, productMode } from "@/lib/config";
import { requestAgent } from "@/lib/http";
import { isVisitBot } from "@/lib/house-traffic";
import {
  VISIT_COOKIE,
  newVisitId,
  parseVisitId,
  recordVisit,
  visitCookieMaxAge,
} from "@/lib/house-visits";
import { withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isVisitBot(requestAgent(request))) {
    return NextResponse.json({ ok: true });
  }
  if (productMode() && isLoopback(clientIpFromHeaders(request.headers))) {
    return NextResponse.json({ ok: true });
  }

  const body = (await request.json().catch(() => ({}))) as {
    path?: string;
    pulse?: boolean;
  };
  const path = typeof body.path === "string" ? body.path.slice(0, 200) : "/";
  const jar = await cookies();
  const vid = parseVisitId(jar.get(VISIT_COOKIE)?.value ?? "") || newVisitId();
  const first = !parseVisitId(jar.get(VISIT_COOKIE)?.value ?? "");
  const token = await getSessionToken();
  const seat = token ? await withStoreRead((store) => userFromToken(store, token)) : null;

  await recordVisit({
    vid,
    signedIn: Boolean(seat),
    userId: seat?.id ?? "",
    path,
    pulse: Boolean(body.pulse) && !first,
  });

  jar.set(VISIT_COOKIE, vid, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: visitCookieMaxAge(),
  });
  return NextResponse.json({ ok: true });
}
