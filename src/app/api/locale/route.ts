import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionToken, userFromToken } from "@/lib/auth";
import { cookieSecure } from "@/lib/config";
import { isHouseUser } from "@/lib/house";
import { jsonError } from "@/lib/http";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { locale?: string };
  const locale = parseLocale(typeof body.locale === "string" ? body.locale : "");
  if (!locale) return jsonError("Unknown language", "Unknown language");
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  const token = await getSessionToken();
  if (token) {
    await withStore((store) => {
      const user = userFromToken(store, token);
      if (user && !isHouseUser(user)) user.locale = locale;
    });
  }
  return NextResponse.json({ locale });
}
