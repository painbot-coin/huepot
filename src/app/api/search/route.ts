import { NextResponse } from "next/server";
import { searchPit } from "@/lib/game";
import { jsonError } from "@/lib/http";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const data = await withStore((store) => searchPit(store, q));
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}
