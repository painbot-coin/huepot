import { earn, setShares } from "@/app/actions";
import { Problem } from "@/components/Shell";
import { money } from "@/lib/password";
import { currentUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const db = readDb();
  const project = db.projects.find((row) => row.id === id);
  if (!project) notFound();
  const me = await currentUser();
  const lines = project.shares
    .map((share) => {
      const person = db.users.find((row) => row.id === share.userId);
      return person ? `${person.username} ${(share.bps / 100).toFixed(0)}` : "";
    })
    .filter(Boolean)
    .join("\n");
  return (
    <>
      <h1>{project.title}</h1>
      <p>{project.brief}</p>
      <p className="mark">Earned {money(project.earningsCents)}</p>
      <Problem message={query.e} />
      <h2>Shares</h2>
      {project.shares.map((share) => {
        const person = db.users.find((row) => row.id === share.userId);
        return (
          <p key={share.userId}>
            {person ? <Link href={`/u/${person.username}`}>@{person.username}</Link> : "missing"} · {share.bps / 100}%
          </p>
        );
      })}
      {me && me.id === project.ownerId ? (
        <>
          <form className="card" action={setShares}>
            <input type="hidden" name="project" value={project.id} />
            <label>One username and percent per line<textarea name="shares" defaultValue={lines} /></label>
            <button type="submit">Save shares</button>
          </form>
          <form className="card" action={earn}>
            <input type="hidden" name="project" value={project.id} />
            <label>Earning in dollars, taken from your wallet<input name="amount" type="number" min="0.01" step="0.01" required /></label>
            <button type="submit">Split it</button>
          </form>
        </>
      ) : null}
    </>
  );
}
