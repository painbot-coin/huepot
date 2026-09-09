import { NextResponse } from "next/server";
import { getSessionToken, requireUser } from "@/lib/auth";
import { readyFriends } from "@/lib/friends";
import { jsonError } from "@/lib/http";
import { insertSocialReport } from "@/lib/reports";
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  packFeed,
  readySocial,
  refreshUnread,
  reportSocial,
  toggleLike,
  youPayload,
} from "@/lib/social";
import { withStore, withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getSessionToken();
    await readyFriends();
    await readySocial();
    const payload = await withStoreRead(async (store) => {
      const user = requireUser(store, token);
      const unread = await refreshUnread(user.id);
      const you = youPayload(user);
      you.unreadMessages = unread;
      return { you, ...(await packFeed(store, user)) };
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
      body?: string;
      postId?: string;
      commentId?: string;
    };
    await readyFriends();
    await readySocial();
    const payload = await withStore(async (store) => {
      const user = requireUser(store, token);
      if (body.action === "post") await createPost(store, user, body.body ?? "");
      else if (body.action === "like") await toggleLike(store, user, body.postId ?? "");
      else if (body.action === "comment") {
        await addComment(store, user, body.postId ?? "", body.body ?? "");
      } else if (body.action === "delete-post") {
        await deletePost(store, user, body.postId ?? "");
      } else if (body.action === "delete-comment") {
        await deleteComment(store, user, body.commentId ?? "");
      } else if (body.action === "report-post" || body.action === "report-comment") {
        const kind = body.action === "report-post" ? "post" : "comment";
        const target = kind === "post" ? (body.postId ?? "") : (body.commentId ?? "");
        const report = await reportSocial(store, user, kind, target);
        await insertSocialReport(report);
      } else {
        throw new Error("Unknown feed action.");
      }
      const you = youPayload(user);
      you.unreadMessages = await refreshUnread(user.id);
      return { you, ...(await packFeed(store, user)) };
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
