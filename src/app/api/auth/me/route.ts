import { NextResponse } from "next/server";
import {
  getSessionToken,
  toPublicUser,
  userFromToken,
} from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getSessionToken();
    const payload = await withStoreRead((store) => {
      const user = userFromToken(store, token);
      if (!user) return { user: null };
      return { user: toPublicUser(user, [], store) };
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
