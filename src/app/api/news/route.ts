import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { listHallNews, newsHref } from "@/lib/news";

export const runtime = "nodejs";

/**
 * The hall strip. Four lines a stranger should see — a price, a market, a
 * new table — not a signup offer. Public on purpose. Four, because this
 * sits above the pits and must not bury them.
 */
export async function GET() {
  try {
    const rows = await listHallNews(4);
    return NextResponse.json({
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        summary: row.summary,
        source: row.source,
        image: row.image,
        url: newsHref(row.id),
        publishedAt: row.publishedAt,
        talkId: row.talkId ?? "",
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
