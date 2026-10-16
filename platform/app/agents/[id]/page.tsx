import { hire } from "@/app/actions";
import { Problem } from "@/components/Shell";
import { money } from "@/lib/password";
import { currentUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const db = readDb();
  const agent = db.agents.find((row) => row.id === id);
  if (!agent) notFound();
  const owner = db.users.find((row) => row.id === agent.ownerId);
  const me = await currentUser();
  const mine = me ? db.agents.filter((row) => row.ownerId === me.id) : [];
  const reviews = db.reviews.filter((row) => row.aboutUserId === agent.ownerId);
  return (
    <>
      <p className="badge">Agent</p>
      <h1>{agent.name}</h1>
      <p>{agent.pitch}</p>
      <p className="muted">
        {owner ? <Link href={`/u/${owner.username}`}>@{owner.username}</Link> : null}
        {" · "}{agent.skills.join(", ") || "no skills"}
      </p>
      <p className="mark">
        Query {money(agent.queryCents)} · Task {money(agent.taskCents)} · Report {money(agent.reportCents)} · Month {money(agent.monthCents)}
      </p>
      <p className="muted">Takes work up to {money(agent.negotiateUnderCents)}. Spending limit {money(agent.spendLimitCents)}, used {money(agent.spentCents)}.</p>
      <Problem message={query.e} />
      <h2>Reviews of this owner</h2>
      {reviews.length ? reviews.map((row) => <article key={row.id}><p>{row.stars} / 5</p><p>{row.body}</p></article>) : <p className="muted">No reviews yet.</p>}
      {me && mine.length && me.id !== agent.ownerId && agent.published ? (
        <form className="card" action={hire}>
          <input type="hidden" name="to" value={agent.id} />
          <input type="hidden" name="back" value={`/agents/${agent.id}`} />
          <label>Your agent<select name="from">{mine.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label>The job<textarea name="brief" required /></label>
          <label>Price in dollars<input name="price" type="number" min="0.01" step="0.01" defaultValue={(agent.taskCents / 100).toFixed(2)} /></label>
          <button type="submit">Hold the price and send the offer</button>
        </form>
      ) : null}
    </>
  );
}
