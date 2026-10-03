import type { Metadata } from "next";
import Link from "next/link";
import { AtriumError } from "@/components/AtriumBits";
import { HouseButton, HouseField, PageHead } from "@/components/HouseUi";
import { openCircle } from "@/app/atrium/actions";
import { readDb } from "@/lib/atrium/store";
import { getHeaderUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Circles" };

export default async function CirclesPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const query = await searchParams;
  const user = await getHeaderUser();
  const db = readDb();
  return (
    <main className="app-page is-in-floor">
      <PageHead lead="A circle is a room people open. An empty list stays empty." title="Circles" />
      <AtriumError error={query.e} />
      {db.circles.length === 0 ? <p className="account-note">No circles yet.</p> : null}
      <div className="hall-doors">
        {db.circles.map((row) => (
          <Link className="hall-door" href={`/atrium/circles/${row.slug}`} key={row.id}>
            <strong>{row.name}</strong>
            <span>
              {row.brief || "No brief."} · {row.memberIds.length} {row.memberIds.length === 1 ? "member" : "members"}
            </span>
          </Link>
        ))}
      </div>
      {user ? (
        <form action={openCircle} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
          <HouseField label="Name" name="name" required fullWidth />
          <HouseField label="Brief" name="brief" fullWidth />
          <HouseButton type="submit">Open a circle</HouseButton>
        </form>
      ) : null}
    </main>
  );
}
