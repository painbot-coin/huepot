import { openProject } from "@/app/actions";
import { Problem } from "@/components/Shell";
import { money } from "@/lib/password";
import { currentUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const query = await searchParams;
  const me = await currentUser();
  const db = readDb();
  return (
    <>
      <h1>Projects</h1>
      <p className="muted">Ownership is a list of shares that add to 100%. When the owner records an earning, the wallet splits it. There is no second token.</p>
      <Problem message={query.e} />
      <div className="cards">
        {db.projects.map((project) => (
          <Link key={project.id} className="card" href={`/projects/${project.id}`}>
            <strong>{project.title}</strong>
            <p>{project.brief}</p>
            <p className="muted">Earned {money(project.earningsCents)}</p>
          </Link>
        ))}
      </div>
      {!db.projects.length ? <p className="muted">No project yet.</p> : null}
      {me ? (
        <form className="card" action={openProject}>
          <label>Title<input name="title" required /></label>
          <label>What it is<textarea name="brief" /></label>
          <button type="submit">Open the project</button>
        </form>
      ) : null}
    </>
  );
}
