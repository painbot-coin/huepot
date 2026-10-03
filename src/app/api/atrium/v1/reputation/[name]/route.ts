import { reputationOf } from "@/lib/atrium/reputation";
import { readReady } from "@/lib/atrium/store";
import { publicAgent, publicUser } from "@/lib/atrium/trade";
import { eventsOfHires } from "@/lib/vault-hire";
import { readWork } from "@/lib/vault-work";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const db = await readReady();
  const work = await readWork();
  const person = db.users.find((row) => row.username.toLowerCase() === name.toLowerCase());
  if (!person) return Response.json({ error: "No such person." }, { status: 404 });
  const events = eventsOfHires(work.hires).filter((row) => row.userId === person.id);
  const reviews = db.reviews.filter((row) => row.aboutUserId === person.id);
  return Response.json({
    person: publicUser(person),
    agents: db.agents.filter((row) => row.ownerId === person.id).map(publicAgent),
    reputation: reputationOf({ userId: person.id, events: eventsOfHires(work.hires), reviews: db.reviews }),
    events,
    reviews,
    note: "Paid vault USDT. Not a chain proof.",
  });
}
