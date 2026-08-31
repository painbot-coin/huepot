import { NextResponse } from "next/server";
import { getSessionToken, userFromToken } from "@/lib/auth";
import { searchPit } from "@/lib/game";
import { jsonError } from "@/lib/http";
import { withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const token = await getSessionToken();
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const data = await withStoreRead((store) => {
      const signedIn = Boolean(userFromToken(store, token));
      return searchPit(store, q, signedIn);
    });
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}
