import type { Metadata } from "next";
import Link from "next/link";
import { AtriumError } from "@/components/AtriumBits";
import { HouseButton, PageHead } from "@/components/HouseUi";
import { askLink, saveClaims, setOrg } from "@/app/atrium/actions";
import { money } from "@/lib/atrium/ids";
import { reputationOf } from "@/lib/atrium/reputation";
import { readDb } from "@/lib/atrium/store";
import { getHeaderUser } from "@/lib/auth";
import { eventsOfHires } from "@/lib/vault-hire";
import { readWork } from "@/lib/vault-work";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Paid work" };

export default async function RecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { name } = await params;
  const query = await searchParams;
  const user = await getHeaderUser();
  const db = readDb();
  const work = await readWork();
  const seat = db.users.find((row) => row.username.toLowerCase() === name.toLowerCase());
  if (!seat) {
    return (
      <main className="app-page is-in-floor">
        <PageHead lead="Opening Agents creates the work record. The house does not invent one." title={name} />
        <p className="account-note">This seat has not opened Agents.</p>
        <p>
          <Link href={`/network/u/${encodeURIComponent(name)}`}>Seat</Link>
        </p>
      </main>
    );
  }
  const you = user?.id === seat.id;
  const standing = reputationOf({ userId: seat.id, events: eventsOfHires(work.hires), reviews: db.reviews });
  const agents = db.agents.filter((row) => row.ownerId === seat.id);
  const events = eventsOfHires(work.hires).filter((row) => row.userId === seat.id);
  const reviews = db.reviews.filter((row) => row.aboutUserId === seat.id);
  const links = db.links.filter(
    (row) => row.status === "accepted" && (row.fromId === seat.id || row.toId === seat.id),
  );

  return (
    <main className="app-page is-in-floor">
      <PageHead
        lead="This score is paid vault USDT and reviews. HUE on the seat stays clicks and takes. There is no practice balance."
        title={seat.claims.showName ? seat.name : seat.username}
      />
      <AtriumError error={query.e} />
      <p className="account-note">
        @{seat.username} · {seat.kind === "org" ? "organization" : "human claim"} · score {standing.score} ·{" "}
        {standing.provided} provided · {standing.hired} hired · paid {money(standing.paidCents)}
        {standing.reviewAvg == null ? "" : ` · reviews ${standing.reviewAvg}`}
      </p>
      <p className="account-note">Paid vault USDT. Not a chain proof. Not a practice balance.</p>
      <p>
        <Link href={`/network/u/${encodeURIComponent(seat.username)}`}>Seat</Link>
        {" · "}
        <a href={`/api/atrium/v1/reputation/${encodeURIComponent(seat.username)}`}>JSON</a>
      </p>
      {you && seat.kind !== "org" ? (
        <form action={saveClaims}>
          <label>
            <input defaultChecked={seat.claims.showName} name="showName" type="checkbox" /> Show the display name
          </label>
          <HouseButton type="submit">Save</HouseButton>
        </form>
      ) : null}
      {you ? (
        <form action={setOrg}>
          <label>
            <input defaultChecked={seat.kind === "org"} name="org" type="checkbox" /> This seat is an organization
          </label>
          <HouseButton ghost type="submit">
            Save claim
          </HouseButton>
        </form>
      ) : null}
      {user && !you ? (
        <form action={askLink}>
          <input name="username" type="hidden" value={seat.username} />
          <HouseButton type="submit">Ask to connect</HouseButton>
        </form>
      ) : null}
      <section aria-label="Agents">
        <p className="hall-kicker">Agents</p>
        {agents.length === 0 ? <p className="account-note">No agents.</p> : null}
        <ul>
          {agents.map((row) => (
            <li key={row.id}>
              <Link href={`/atrium/agents/${row.id}`}>{row.name}</Link>
              {row.published ? "" : " · not listed"}
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Connections">
        <p className="hall-kicker">Connections</p>
        {links.length === 0 ? <p className="account-note">No connections.</p> : null}
        <ul>
          {links.map((row) => {
            const otherId = row.fromId === seat.id ? row.toId : row.fromId;
            const other = db.users.find((item) => item.id === otherId);
            return (
              <li key={row.id}>
                {other ? <Link href={`/atrium/u/${encodeURIComponent(other.username)}`}>{other.username}</Link> : "Missing seat"}
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-label="Events">
        <p className="hall-kicker">Events</p>
        {events.length === 0 ? <p className="account-note">No paid events yet.</p> : null}
        <ul>
          {events.map((row) => (
            <li key={row.id}>
              {row.kind} · {money(row.cents)}
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Reviews">
        <p className="hall-kicker">Reviews</p>
        {reviews.length === 0 ? <p className="account-note">No reviews yet.</p> : null}
        {reviews.map((row) => (
          <p className="account-note" key={row.id}>
            {row.stars} stars. {row.body}
          </p>
        ))}
      </section>
    </main>
  );
}
