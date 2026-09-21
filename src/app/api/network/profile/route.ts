import { NextResponse } from "next/server";
import { getSessionToken, requireUser, userFromToken } from "@/lib/auth";
import { boardPlaceFor } from "@/lib/board-sit";
import { readyFriends } from "@/lib/friends";
import { jsonError } from "@/lib/http";
import { listHouseBoard, playerRecord } from "@/lib/record";
import { ensureInviteCode } from "@/lib/referrals";
import {
  AUTHOR_PAGE,
  countAuthorPosts,
  listAuthorPosts,
  publicProfile,
  readySocial,
  refreshUnread,
  saveProfile,
  youPayload,
} from "@/lib/social";
import { withStore, withStoreRead } from "@/lib/store";
import { listSeatTakes } from "@/lib/takes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const token = await getSessionToken();
    await readyFriends();
    await readySocial();
    const search = new URL(request.url).searchParams;
    const username = search.get("u") ?? "";
    const asked = Number(search.get("limit"));
    const limit = Number.isFinite(asked) && asked > 0 ? asked : AUTHOR_PAGE;
    const payload = await withStoreRead(async (store) => {
      const user = userFromToken(store, token);
      if (user) ensureInviteCode(store, user);
      if (!username && !user) {
        const error = new Error("Sign in to continue.");
        (error as Error & { status: number }).status = 401;
        throw error;
      }
      const look = username || user!.username;
      const profile = publicProfile(store, user, look);
      const author = Object.values(store.users).find(
        (item) => item.username.toLowerCase() === profile.username.toLowerCase(),
      );
      if (author) {
        profile.record = await playerRecord(author.id);
        const board = await listHouseBoard();
        profile.place = boardPlaceFor(board, author.username);
        profile.lastTakes = await listSeatTakes(store, author.id, 6);
      }
      const you = user ? youPayload(user) : null;
      if (you && user) you.unreadMessages = await refreshUnread(user.id);
      return {
        you,
        profile,
        posts: author ? await listAuthorPosts(store, user, author.id, limit) : [],
        total: author ? await countAuthorPosts(author.id) : 0,
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
      avatar?: string;
    };
    await readyFriends();
    await readySocial();
    const payload = await withStore(async (store) => {
      const user = requireUser(store, token);
      const profile = saveProfile(store, user, body);
      profile.record = await playerRecord(user.id);
      const board = await listHouseBoard();
      profile.place = boardPlaceFor(board, user.username);
      profile.lastTakes = await listSeatTakes(store, user.id, 6);
      const you = youPayload(user);
      you.unreadMessages = await refreshUnread(user.id);
      return { you, profile };
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
