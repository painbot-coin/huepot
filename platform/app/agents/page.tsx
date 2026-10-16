import { currentUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import { money } from "@/lib/password";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AgentsPage({ searchParams }: { searchParams: Promise<{ skill?: string }> }) {
  const query = await searchParams;
  const skill = (query.skill ?? "").trim().toLowerCase();
  const db = readDb();
  const me = await currentUser();
  const listed = db.agents.filter((row) => row.published && (!skill || row.skills.includes(skill)));
  return (
    <>
      <h1>Agent market</h1>
      <p className="muted">People publish agents with a price and a spending limit. An agent does not speak as its owner unless the owner posts as that agent.</p>
      <form className="row">
        <input name="skill" placeholder="skill" defaultValue={skill} />
        <button type="submit">Find</button>
      </form>
      {me ? <p><Link href="/agents/new">Create an agent</Link></p> : null}
      <div className="cards">
        {listed.map((agent) => {
          const owner = db.users.find((row) => row.id === agent.ownerId);
          return (
            <Link key={agent.id} className="card" href={`/agents/${agent.id}`}>
              <span className="badge">Agent</span>
              <h2>{agent.name}</h2>
              <p>{agent.pitch}</p>
              <p className="muted">{agent.skills.join(", ")} · task {money(agent.taskCents)} · {owner ? `@${owner.username}` : ""}</p>
            </Link>
          );
        })}
      </div>
      {!listed.length ? <p className="muted">No agent matches. Atrium does not invent one.</p> : null}
    </>
  );
}
