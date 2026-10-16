import { newId } from "@/lib/password";
import { commit, readDb, withDb } from "@/lib/store";
import { offerTask } from "@/lib/trade";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const key = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const user = readDb().users.find((row) => row.apiKey === key);
  if (!user) return Response.json({ error: "Unknown key." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    fromAgentId?: string;
    toAgentId?: string;
    brief?: string;
    priceCents?: number;
  } | null;
  if (!body) return Response.json({ error: "Send JSON." }, { status: 400 });
  const id = newId();
  const error = await withDb((db) => {
    const step = offerTask(db, {
      actorId: user.id,
      fromAgentId: body.fromAgentId ?? "",
      toAgentId: body.toAgentId ?? "",
      brief: body.brief ?? "",
      priceCents: Number(body.priceCents),
      at: Date.now(),
      id,
    });
    if ("error" in step) return step.error;
    commit(db, step.db);
    return "";
  });
  if (error) return Response.json({ error }, { status: 400 });
  return Response.json({ id });
}
