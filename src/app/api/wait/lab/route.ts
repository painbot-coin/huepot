import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { isLabId, learnLab, snapshotLab } from "@/lib/lab-stack";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const game = new URL(request.url).searchParams.get("game") || "";
    if (!isLabId(game)) {
      return NextResponse.json({ error: "That lab is not on the table." }, { status: 400 });
    }
    return NextResponse.json(await snapshotLab(game));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      game?: unknown;
      before?: unknown;
      after?: unknown;
      reward?: unknown;
      source?: unknown;
      score?: unknown;
      gameOver?: unknown;
    };
    const game = typeof body.game === "string" ? body.game : "";
    if (!isLabId(game)) {
      return NextResponse.json({ error: "That lab is not on the table." }, { status: 400 });
    }
    const source = body.source === "user" ? "user" : body.source === "house" ? "house" : "";
    if (!source) {
      return NextResponse.json({ error: "The lock needs a seat." }, { status: 400 });
    }
    const book = await learnLab({
      game,
      before: body.before,
      after: body.after,
      reward: Number(body.reward) || 0,
      source,
      score: Math.max(0, Math.floor(Number(body.score) || 0)),
      gameOver: body.gameOver === true,
    });
    if (!book) {
      return NextResponse.json({ error: "That lesson is not a sit." }, { status: 400 });
    }
    return NextResponse.json(book);
  } catch (error) {
    return jsonError(error);
  }
}
