import { NextResponse } from "next/server";
import { getSessionToken, requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { markNoticeRead, userNotices } from "@/lib/notifications";
import { withStore, withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getSessionToken();
    const payload = await withStoreRead((store) => {
      const user = requireUser(store, token);
      const items = userNotices(store, user.id).slice(0, 40);
      const unread = items.filter((item) => !item.read).length;
      return { items, unread };
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const body = (await request.json().catch(() => ({}))) as { id?: string };
    const payload = await withStore((store) => {
      const user = requireUser(store, token);
      markNoticeRead(store, user.id, body.id);
      const items = userNotices(store, user.id).slice(0, 40);
      const unread = items.filter((item) => !item.read).length;
      return { items, unread };
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
