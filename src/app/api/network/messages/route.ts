import { NextResponse } from "next/server";
import { getSessionToken, requireUser } from "@/lib/auth";
import { readyFriends } from "@/lib/friends";
import { jsonError } from "@/lib/http";
import {
  listInbox,
  listThread,
  readySocial,
  refreshUnread,
  sendMessage,
  youPayload,
} from "@/lib/social";
import { withStore, withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const token = await getSessionToken();
    await readyFriends();
    await readySocial();
    const withUser = new URL(request.url).searchParams.get("with") ?? "";
    const payload = await withStoreRead(async (store) => {
      const user = requireUser(store, token);
      const you = youPayload(user);
      you.unreadMessages = await refreshUnread(user.id);
      if (withUser) {
        const thread = await listThread(store, user, withUser);
        return { you, inbox: await listInbox(store, user), ...thread };
      }
      return { you, inbox: await listInbox(store, user), with: "", messages: [] };
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const body = (await request.json().catch(() => ({}))) as {
      username?: string;
      body?: string;
    };
    await readyFriends();
    await readySocial();
    const payload = await withStore(async (store) => {
      const user = requireUser(store, token);
      const thread = await sendMessage(store, user, body.username ?? "", body.body ?? "");
      const you = youPayload(user);
      you.unreadMessages = await refreshUnread(user.id);
      return { you, inbox: await listInbox(store, user), ...thread };
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
