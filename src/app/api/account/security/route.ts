import { NextResponse } from "next/server";
import {
  changeEmail,
  changePassword,
  changeUsername,
  confirmAge,
  getSessionToken,
  listPublicSessions,
  requireUser,
  revokeOtherSessions,
  revokeSession,
  sendVerifyMail,
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
      current?: string;
      next?: string;
      username?: string;
      email?: string;
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
      if (body.action === "email") {
        const previous = changeEmail(store, user, body.email ?? "", body.current ?? "");
        return {
          user: toPublicUser(user, [], store),
          previousEmail: previous,
          email: user.email,
          username: user.username,
          verify: true,
        };
      }
      if (body.action === "password") {
        changePassword(user, body.current ?? "", body.next ?? "");
        return { ok: true, email: user.email, username: user.username };
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
    if (payload && "verify" in payload && payload.verify && "email" in payload) {
      const { sendMail, securityEmailHtml } = await import("@/lib/mail");
      const fresh = await withStoreRead((store) => {
        const user = requireUser(store, token);
        return user;
      });
      void sendVerifyMail(fresh);
      if ("previousEmail" in payload && payload.previousEmail) {
        void sendMail(
          payload.previousEmail,
          "Huepot email changed",
          securityEmailHtml(
            payload.username,
            "email",
            `New address: ${payload.email}. Confirm it from Account.`,
          ),
        );
      }
    }
    if (payload && "email" in payload && payload.email && !("verify" in payload && payload.verify)) {
      const { sendMail, securityEmailHtml } = await import("@/lib/mail");
      void sendMail(
        payload.email,
        "Huepot password changed",
        securityEmailHtml(payload.username, "password", "Changed from Account."),
      );
    }
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
