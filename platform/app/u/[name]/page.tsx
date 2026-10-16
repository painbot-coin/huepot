import { askLink, saveClaims } from "@/app/actions";
import { Problem } from "@/components/Shell";
import { money } from "@/lib/password";
import { reputationOf } from "@/lib/reputation";
import { currentUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { name } = await params;
  const query = await searchParams;
  const db = readDb();
  const person = db.users.find((row) => row.username === name);
  if (!person) notFound();
  const me = await currentUser();
  const agents = db.agents.filter((row) => row.ownerId === person.id);
  const rep = reputationOf({ userId: person.id, events: db.events, reviews: db.reviews });
  const links = db.links.filter(
    (row) => row.status === "accepted" && (row.fromId === person.id || row.toId === person.id),
  );
  return (
    <>
      <p className="badge">{person.kind === "org" ? "Organization" : "Human"}{person.claims.over18 ? " · 18+" : ""}</p>
      <h1>{person.claims.showName ? person.name : "Name hidden"}</h1>
      <p className="muted">@{person.username}</p>
      <Problem message={query.e} />
      <section className="card">
        <h2>Record</h2>
        <p className="mark">{rep.score} from {rep.provided} paid jobs, {rep.hired} hires, {rep.reviewCount} reviews{rep.reviewAvg == null ? "" : ` averaging ${rep.reviewAvg}`}.</p>
        <p className="muted">Paid to this person: {money(rep.paidCents)}. The number is that history. It is not a chain proof.</p>
        <p><a href={`/api/v1/reputation/${person.username}`}>Export the record</a></p>
      </section>
      <section>
        <h2>Agents</h2>
        <div className="cards">
          {agents.length ? agents.map((agent) => (
            <Link key={agent.id} className="card" href={`/agents/${agent.id}`}>
              <strong>{agent.name}</strong>
              <p>{agent.pitch}</p>
              <p className="muted">{agent.published ? "On the market" : "Private"} · task {money(agent.taskCents)}</p>
            </Link>
          )) : <p className="muted">No agents yet.</p>}
        </div>
      </section>
      <section>
        <h2>Connected</h2>
        {links.length ? links.map((row) => {
          const otherId = row.fromId === person.id ? row.toId : row.fromId;
          const other = db.users.find((user) => user.id === otherId);
          return other ? <p key={row.id}><Link href={`/u/${other.username}`}>@{other.username}</Link></p> : null;
        }) : <p className="muted">No connections yet.</p>}
      </section>
      {me && me.id === person.id && person.kind === "human" ? (
        <form className="card" action={saveClaims}>
          <label className="row"><input name="showName" type="checkbox" defaultChecked={person.claims.showName} /> Show my name</label>
          <button type="submit">Save</button>
        </form>
      ) : null}
      {me && me.id !== person.id ? (
        <form action={askLink}>
          <input type="hidden" name="username" value={person.username} />
          <button type="submit">Ask to connect</button>
        </form>
      ) : null}
    </>
  );
}
