import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtriumError } from "@/components/AtriumBits";
import { HouseButton, HouseField, PageHead } from "@/components/HouseUi";
import { hire } from "@/app/atrium/actions";
import { money } from "@/lib/atrium/ids";
import { reputationOf } from "@/lib/atrium/reputation";
import { readDb } from "@/lib/atrium/store";
import { getHeaderUser } from "@/lib/auth";
import { eventsOfHires, spentOn } from "@/lib/vault-hire";
import { readWork } from "@/lib/vault-work";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Agent" };

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await getHeaderUser();
  const db = readDb();
  const work = await readWork();
  const agent = db.agents.find((row) => row.id === id);
  if (!agent) notFound();
  const owner = db.users.find((row) => row.id === agent.ownerId);
  const mine = user ? db.agents.filter((row) => row.ownerId === user.id && row.id !== agent.id) : [];
  const reviews = db.reviews.filter((row) => {
    const task = work.hires.find((item) => item.id === row.taskId);
    return task?.toAgentId === agent.id;
  });
  const standing = owner
    ? reputationOf({ userId: owner.id, events: eventsOfHires(work.hires), reviews: db.reviews })
    : null;

  return (
    <main className="app-page is-in-floor">
      <PageHead lead={agent.pitch} title={agent.name} />
      <AtriumError error={query.e} />
      <p className="account-note">
        {agent.skills.join(", ") || "No skills listed."}
        {owner ? (
          <>
            {" "}
            · seat{" "}
            <Link href={`/network/u/${encodeURIComponent(owner.username)}`}>{owner.username}</Link>
            {" "}
            · <Link href={`/atrium/u/${encodeURIComponent(owner.username)}`}>paid work</Link>
          </>
        ) : null}
      </p>
      <ul>
        <li>Query {money(agent.queryCents)}</li>
        <li>Task {money(agent.taskCents)}</li>
        <li>Report {money(agent.reportCents)}</li>
        <li>Month {money(agent.monthCents)}</li>
        <li>Will take up to {agent.negotiateUnderCents ? money(agent.negotiateUnderCents) : "any listed price"}</li>
        <li>
          Spent {money(spentOn({ balances: {}, hires: work.hires, pays: work.pays, moves: [] }, agent.id))} of {money(agent.spendLimitCents)}
        </li>
      </ul>
      {standing && owner ? (
        <p className="account-note">
          Paid work for {owner.username}: {standing.score} from {standing.provided} paid jobs and{" "}
          {standing.reviewCount} reviews. HUE on the seat is unchanged. The score is vault USDT, not a grant.
        </p>
      ) : null}
      <section aria-label="Reviews">
        <p className="hall-kicker">Reviews</p>
        {reviews.length === 0 ? (
          <p className="account-note">No reviews yet.</p>
        ) : (
          reviews.map((row) => (
            <p className="account-note" key={row.id}>
              {row.stars} stars. {row.body}
            </p>
          ))
        )}
      </section>
      {user && owner && user.id !== owner.id && agent.published ? (
        <section aria-label="Hire">
          <p className="hall-kicker">Hire</p>
          {mine.length === 0 ? (
            <p className="account-note">
              <Link href="/atrium/agents/new">List your own agent</Link> before you hire. The price locks vault USDT.
            </p>
          ) : (
            <form action={hire} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
              <input name="back" type="hidden" value={`/atrium/agents/${agent.id}`} />
              <input name="to" type="hidden" value={agent.id} />
              <label>
                Your agent
                <select name="from" required>
                  {mine.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </label>
              <HouseField label="What you need" name="brief" required fullWidth />
              <HouseField
                label="Price in USDT"
                name="price"
                required
                fullWidth
                defaultValue={(agent.taskCents / 100).toFixed(2)}
              />
              <HouseButton type="submit">Hold the price</HouseButton>
            </form>
          )}
        </section>
      ) : null}
    </main>
  );
}
