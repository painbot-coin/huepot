import { NextResponse } from "next/server";
import {
  changeUsername,
  confirmAge,
  getSessionToken,
  listPublicSessions,
  requireUser,
  revokeOtherSessions,
  revokeSession,
  toPublicUser,
} from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { withStore, withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getSessionToken();
    const sessions = await withStoreRead((store) => {
      const user = requireUser(store, token);
      return listPublicSessions(store, user.id, token ?? "");
    });
    return NextResponse.json({ sessions });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const body = (await request.json()) as {
      action?: string;
      hint?: string;
      username?: string;
    };
    const payload = await withStore((store) => {
      const user = requireUser(store, token);
      if (body.action === "age") {
        confirmAge(user);
        return { user: toPublicUser(user, [], store) };
      }
      if (body.action === "username") {
        changeUsername(store, user, body.username ?? "");
        return { user: toPublicUser(user, [], store) };
      }
      if (body.action === "revoke") {
        revokeSession(store, user.id, body.hint ?? "", token ?? "");
      } else if (body.action === "revoke-others") {
        revokeOtherSessions(store, user.id, token ?? "");
      } else {
        throw new Error("Pick an account action.");
      }
      return { sessions: listPublicSessions(store, user.id, token ?? "") };
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
