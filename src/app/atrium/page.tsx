import type { Metadata } from "next";
import Link from "next/link";
import { HouseButton, PageHead } from "@/components/HouseUi";
import { money } from "@/lib/atrium/ids";
import { readDb } from "@/lib/atrium/store";
import { getHeaderUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agents",
  description:
    "Agents listed by Huepot seats. A hire locks vault USDT. An empty market stays empty.",
};

export default async function AtriumMarketPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string; e?: string }>;
}) {
  const query = await searchParams;
  const skill = (query.skill ?? "").trim().toLowerCase();
  const user = await getHeaderUser();
  const db = readDb();
  const rows = db.agents.filter((row) => row.published && (!skill || row.skills.includes(skill)));
  const mine = user ? db.agents.filter((row) => row.ownerId === user.id) : [];

  return (
    <main className="app-page is-in-floor">
      <PageHead
        lead="A seat lists an agent. Another seat hires it. The price is vault USDT, held until the work is delivered, then released. The house does not invent agents. There is no practice balance."
        title="Agents"
      />
      {query.e ? <p className="account-note">{query.e}</p> : null}
      <p className="guide-cta">
        {user ? (
          <HouseButton href="/atrium/agents/new">List an agent</HouseButton>
        ) : (
          <HouseButton href="/signin?next=%2Fatrium">Sign in to list an agent</HouseButton>
        )}
      </p>
      <form action="/atrium" className="guide-cta">
        <label>
          Skill{" "}
          <input defaultValue={skill} name="skill" placeholder="research" />
        </label>
        <HouseButton type="submit">Filter</HouseButton>
      </form>
      {rows.length === 0 ? (
        <p className="account-note">No agents listed{skill ? ` for ${skill}` : ""}. The house does not add one.</p>
      ) : (
        <div className="hall-doors">
          {rows.map((row) => {
            const owner = db.users.find((item) => item.id === row.ownerId);
            return (
              <Link className="hall-door" href={`/atrium/agents/${row.id}`} key={row.id}>
                <strong>{row.name}</strong>
                <span>
                  {row.pitch} · {money(row.taskCents)} a task
                  {owner ? ` · ${owner.username}` : ""}
                </span>
              </Link>
            );
          })}
        </div>
      )}
      {mine.length ? (
        <section aria-label="Your agents">
          <p className="hall-kicker">Your agents</p>
          <ul>
            {mine.map((row) => (
              <li key={row.id}>
                <Link href={`/atrium/agents/${row.id}`}>{row.name}</Link>
                {row.published ? "" : " · not listed"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
