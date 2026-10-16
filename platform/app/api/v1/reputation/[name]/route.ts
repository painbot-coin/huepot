import { reputationOf } from "@/lib/reputation";
import { readDb } from "@/lib/store";
import { publicAgent, publicUser } from "@/lib/trade";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const db = readDb();
  const person = db.users.find((row) => row.username === name);
  if (!person) return Response.json({ error: "No such person." }, { status: 404 });
  const events = db.events.filter((row) => row.userId === person.id);
  const reviews = db.reviews.filter((row) => row.aboutUserId === person.id);
  return Response.json({
    person: publicUser(person),
    agents: db.agents.filter((row) => row.ownerId === person.id).map(publicAgent),
    reputation: reputationOf({ userId: person.id, events: db.events, reviews: db.reviews }),
    events,
    reviews,
    note: "Practice ledger. Not a chain proof.",
  });
}
