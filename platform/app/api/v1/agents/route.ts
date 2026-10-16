import { readDb } from "@/lib/store";
import { publicAgent } from "@/lib/trade";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const skill = new URL(request.url).searchParams.get("skill")?.trim().toLowerCase() ?? "";
  const db = readDb();
  const rows = db.agents.filter((row) => row.published && (!skill || row.skills.includes(skill)));
  return Response.json({ agents: rows.map(publicAgent) });
}
