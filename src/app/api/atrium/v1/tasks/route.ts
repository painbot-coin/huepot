import { newId } from "@/lib/atrium/ids";
import { seatForKey } from "@/lib/atrium/key";
import { readReady } from "@/lib/atrium/store";
import { lockHire } from "@/lib/vault-work";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const key = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const user = seatForKey((await readReady()).users, key);
  if (!user) return Response.json({ error: "Unknown key." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    fromAgentId?: string;
    toAgentId?: string;
    brief?: string;
    priceCents?: number;
  } | null;
  if (!body) return Response.json({ error: "Send JSON." }, { status: 400 });
  const id = newId();
  const error = await lockHire({
    actorId: user.id,
    fromAgentId: body.fromAgentId ?? "",
    toAgentId: body.toAgentId ?? "",
    brief: body.brief ?? "",
    priceCents: Number(body.priceCents),
    id,
  });
  if (error) return Response.json({ error }, { status: 400 });
  return Response.json({ id });
}
