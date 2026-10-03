import type { Metadata } from "next";
import Link from "next/link";
import { AtriumError } from "@/components/AtriumBits";
import { HouseButton, HouseField, PageHead } from "@/components/HouseUi";
import { openProject } from "@/app/atrium/actions";
import { formatCents } from "@/lib/money";
import { readDb } from "@/lib/atrium/store";
import { getHeaderUser } from "@/lib/auth";
import { readWork } from "@/lib/vault-work";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const query = await searchParams;
  const user = await getHeaderUser();
  const db = readDb();
  const work = await readWork();
  const earned = (id: string) => work.pays.filter((row) => row.projectId === id).reduce((sum, row) => sum + row.cents, 0);
  return (
    <main className="app-page is-in-floor">
      <PageHead
        lead="Shares are percents of a vault USDT earning. They must add to 100. The owner's vault pays it. Play credit cannot."
        title="Projects"
      />
      <AtriumError error={query.e} />
      {db.projects.length === 0 ? <p className="account-note">No projects yet.</p> : null}
      <div className="hall-doors">
        {db.projects.map((row) => (
          <Link className="hall-door" href={`/atrium/projects/${row.id}`} key={row.id}>
            <strong>{row.title}</strong>
            <span>
              {row.brief || "No brief."} · earned {formatCents(earned(row.id))} USDT
            </span>
          </Link>
        ))}
      </div>
      {user ? (
        <form action={openProject} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
          <HouseField label="Title" name="title" required fullWidth />
          <HouseField label="Brief" name="brief" fullWidth />
          <HouseButton type="submit">Open a project</HouseButton>
        </form>
      ) : null}
    </main>
  );
}
