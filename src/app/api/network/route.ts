import { NextResponse } from "next/server";
import { getSessionToken, requireUser } from "@/lib/auth";
import {
  acceptFriendRequest,
  ignoreFriendRequest,
  listNetwork,
  readyFriends,
  sendFriendRequest,
  blockPlayer,
  unblockPlayer,
  unfriend,
} from "@/lib/friends";
import { jsonError } from "@/lib/http";
import { touchPresence } from "@/lib/presence";
import { readySocial, refreshUnread } from "@/lib/social";
import { withStore, withStoreRead } from "@/lib/store";
import type { NetworkTab } from "@/lib/types";

export const runtime = "nodejs";

function parseTab(value: string | null): NetworkTab {
  if (value === "friends" || value === "requests") return value;
  return "pit";
}

export async function GET(request: Request) {
  try {
    const token = await getSessionToken();
    await readyFriends();
    await readySocial();
    const url = new URL(request.url);
    const payload = await withStoreRead(async (store) => {
      const user = requireUser(store, token);
      const data = listNetwork(
        store,
        user,
        parseTab(url.searchParams.get("tab")),
        url.searchParams.get("q") ?? "",
        url.searchParams.get("u") ?? "",
      );
      data.you.unreadMessages = await refreshUnread(user.id);
      return data;
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
      action?: string;
      username?: string;
      tab?: string;
      q?: string;
      u?: string;
    };
    const action = body.action ?? "";
    await readyFriends();
    await readySocial();
    const payload = await withStore(async (store) => {
      const user = requireUser(store, token);
      touchPresence(user.id);
      if (action === "ping") {
        const data = listNetwork(
          store,
          user,
          parseTab(body.tab ?? null),
          body.q ?? "",
          body.u ?? "",
        );
        data.you.unreadMessages = await refreshUnread(user.id);
        return data;
      }
      const username = body.username ?? "";
      if (action === "request") await sendFriendRequest(store, user, username);
      else if (action === "accept") await acceptFriendRequest(store, user, username);
      else if (action === "ignore") await ignoreFriendRequest(store, user, username);
      else if (action === "unfriend") await unfriend(store, user, username);
      else if (action === "block") await blockPlayer(store, user, username);
      else if (action === "unblock") await unblockPlayer(store, user, username);
      else throw new Error("Unknown network action.");
      const data = listNetwork(
        store,
        user,
        parseTab(body.tab ?? null),
        body.q ?? "",
        body.u ?? "",
      );
      data.you.unreadMessages = await refreshUnread(user.id);
      return data;
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
