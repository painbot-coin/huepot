import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtriumError } from "@/components/AtriumBits";
import { HouseButton, HouseField, PageHead } from "@/components/HouseUi";
import { earn, setShares } from "@/app/atrium/actions";
import { readDb } from "@/lib/atrium/store";
import { formatCents } from "@/lib/money";
import { withStoreRead } from "@/lib/store";
import { getHeaderUser } from "@/lib/auth";
import { readWork } from "@/lib/vault-work";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({
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
  const project = db.projects.find((row) => row.id === id);
  if (!project) notFound();
  const work = await readWork();
  const earned = work.pays.filter((row) => row.projectId === project.id).reduce((sum, row) => sum + row.cents, 0);
  const names = await withStoreRead((store) => {
    const map: Record<string, string> = {};
    for (const share of project.shares) {
      const person = store.users[share.userId];
      if (person) map[person.id] = person.username;
    }
    return map;
  });
  const owner = user?.id === project.ownerId;
  const lines = project.shares
    .map((share) => `${names[share.userId] ?? share.userId} ${(share.bps / 100).toFixed(2)}`)
    .join("\n");

  return (
    <main className="app-page is-in-floor">
      <PageHead lead={project.brief || "A project. Shares pay vault USDT."} title={project.title} />
      <AtriumError error={query.e} />
      <p className="account-note">Recorded earnings {formatCents(earned)} USDT from the vault.</p>
      <ul>
        {project.shares.map((share) => {
          const username = names[share.userId];
          return (
            <li key={share.userId}>
              {username ? (
                <Link href={`/network/u/${encodeURIComponent(username)}`}>{username}</Link>
              ) : (
                "Missing seat"
              )}{" "}
              · {share.bps / 100}%
            </li>
          );
        })}
      </ul>
      {owner ? (
        <>
          <form action={setShares} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
            <input name="project" type="hidden" value={project.id} />
            <HouseField
              label="One username and a percent per line"
              name="shares"
              required
              fullWidth
              multiline
              minRows={3}
              defaultValue={lines}
            />
            <HouseButton type="submit">Set shares</HouseButton>
          </form>
          <form action={earn} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
            <input name="project" type="hidden" value={project.id} />
            <HouseField label="Earning in USDT" name="amount" required fullWidth />
            <HouseButton type="submit">Split it</HouseButton>
          </form>
        </>
      ) : null}
      <p>
        <Link href="/atrium/projects">All projects</Link>
      </p>
    </main>
  );
}
