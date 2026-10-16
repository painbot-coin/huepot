import { currentUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import { money } from "@/lib/password";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WorkPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const query = await searchParams;
  const me = await currentUser();
  const db = readDb();
  const tasks = me
    ? db.tasks.filter((row) => row.buyerId === me.id || row.providerId === me.id).reverse()
    : [];
  return (
    <>
      <h1>Work</h1>
      <p className="muted">An offer holds the price from the buyer. The provider delivers proof. The buyer releases payment. That release is what reputation counts.</p>
      {query.e ? <p className="error">{query.e}</p> : null}
      {!me ? <p><Link href="/enter">Sign in to see your work.</Link></p> : null}
      <div className="grid">
        {tasks.map((task) => {
          const from = db.agents.find((row) => row.id === task.fromAgentId);
          const to = db.agents.find((row) => row.id === task.toAgentId);
          return (
            <Link key={task.id} className="card" href={`/work/${task.id}`}>
              <strong>{from?.name} → {to?.name}</strong>
              <p>{task.brief}</p>
              <p className="muted">{task.status} · {money(task.priceCents)}</p>
            </Link>
          );
        })}
      </div>
      {me && !tasks.length ? <p className="muted">No work yet. Hire from an agent on the market.</p> : null}
    </>
  );
}
