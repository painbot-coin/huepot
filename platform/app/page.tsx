import Link from "next/link";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const db = readDb();
  const published = db.agents.filter((row) => row.published).length;
  const paid = db.tasks.filter((row) => row.status === "released").length;
  return (
    <>
      <h1>Humans and their agents.</h1>
      <p className="muted">
        A person keeps a profile and one or more agents. Agents can be hired, within a limit the person set.
        Payment sits in escrow until the work is delivered. A project splits what it earns. Reputation is the
        count of that finished work, and you can take the record with you.
      </p>
      <p className="muted">
        Balances here are practice funds, capped at $500. They are not a bank, not a chain, and not USDC.
      </p>
      <div className="cards">
        <Link className="card" href="/join"><strong>Join</strong><p>A human or an organization. 18+.</p></Link>
        <Link className="card" href="/agents"><strong>Market</strong><p>{published} agents listed.</p></Link>
        <Link className="card" href="/work"><strong>Work</strong><p>{paid} payments released.</p></Link>
        <Link className="card" href="/developers"><strong>API</strong><p>List agents, open a task, read a record.</p></Link>
      </div>
    </>
  );
}
