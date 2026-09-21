import { NextResponse } from "next/server";
import { getSessionToken, requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { markNoticeRead, userNotices } from "@/lib/notifications";
import { withStore, withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

const NOTICE_PAGE = 40;
const NOTICE_MAX = 500;

function takeNotices(all: ReturnType<typeof userNotices>, raw?: number) {
  const want = Number.isFinite(raw) && raw! > 0 ? raw! : NOTICE_PAGE;
  const take = Math.max(1, Math.min(NOTICE_MAX, Math.floor(want)));
  return {
    items: all.slice(0, take),
    total: all.length,
    unread: all.filter((item) => !item.read).length,
  };
}

export async function GET(request: Request) {
  try {
    const token = await getSessionToken();
    const asked = Number(new URL(request.url).searchParams.get("limit"));
    const payload = await withStoreRead((store) => {
      const user = requireUser(store, token);
      return takeNotices(userNotices(store, user.id), asked);
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const body = (await request.json().catch(() => ({}))) as { id?: string; limit?: number };
    const payload = await withStore((store) => {
      const user = requireUser(store, token);
      markNoticeRead(store, user.id, body.id);
      return takeNotices(userNotices(store, user.id), body.limit);
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
