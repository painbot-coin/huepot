import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { rewardOf } from "@/lib/tetris-ai";
import { learnStack, readCells, snapshotStack } from "@/lib/tetris-stack";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await snapshotStack());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      before?: unknown;
      after?: unknown;
      lines?: unknown;
      dead?: unknown;
      source?: unknown;
      gameLines?: unknown;
      gameOver?: unknown;
    };
    const before = readCells(body.before);
    const after = readCells(body.after);
    if (!before || !after) {
      return NextResponse.json({ error: "That lock is not a board." }, { status: 400 });
    }
    const source = body.source === "user" ? "user" : body.source === "house" ? "house" : "";
    if (!source) {
      return NextResponse.json({ error: "The lock needs a seat." }, { status: 400 });
    }
    const lines = Math.max(0, Math.min(4, Math.floor(Number(body.lines) || 0)));
    const dead = body.dead === true;
    const gameLines = Math.max(0, Math.floor(Number(body.gameLines) || 0));
    const book = await learnStack({
      before,
      after,
      reward: rewardOf(lines, dead),
      source,
      gameLines,
      gameOver: body.gameOver === true,
    });
    return NextResponse.json(book);
  } catch (error) {
    return jsonError(error);
  }
}
