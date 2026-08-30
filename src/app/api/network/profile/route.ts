import { NextResponse } from "next/server";
import { getSessionToken, requireUser } from "@/lib/auth";
import { readyFriends } from "@/lib/friends";
import { jsonError } from "@/lib/http";
import {
  listAuthorPosts,
  publicProfile,
  readySocial,
  refreshUnread,
  saveProfile,
  youPayload,
} from "@/lib/social";
import { withStore, withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const token = await getSessionToken();
    await readyFriends();
    await readySocial();
    const username = new URL(request.url).searchParams.get("u") ?? "";
    const payload = await withStoreRead(async (store) => {
      const user = requireUser(store, token);
      const you = youPayload(user);
      you.unreadMessages = await refreshUnread(user.id);
      const profile = publicProfile(store, user, username || user.username);
      const author = Object.values(store.users).find(
        (item) => item.username.toLowerCase() === profile.username.toLowerCase(),
      );
      return {
        you,
        profile,
        posts: author ? await listAuthorPosts(store, user, author.id) : [],
      };
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
      headline?: string;
      about?: string;
      location?: string;
    };
    await readyFriends();
    await readySocial();
    const payload = await withStore(async (store) => {
      const user = requireUser(store, token);
      const profile = saveProfile(store, user, body);
      const you = youPayload(user);
      you.unreadMessages = await refreshUnread(user.id);
      return { you, profile };
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
