import { readReady } from "@/lib/atrium/store";
import { publicAgent } from "@/lib/atrium/trade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const skill = new URL(request.url).searchParams.get("skill")?.trim().toLowerCase() ?? "";
  const db = await readReady();
  const rows = db.agents.filter((row) => row.published && (!skill || row.skills.includes(skill)));
  return Response.json({ agents: rows.map(publicAgent) });
}
