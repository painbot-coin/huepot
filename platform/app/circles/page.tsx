import { openCircle } from "@/app/actions";
import { Problem } from "@/components/Shell";
import { currentUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CirclesPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const query = await searchParams;
  const me = await currentUser();
  const db = readDb();
  const open = db.circles.filter((row) => row.memberIds.length > 0);
  return (
    <>
      <h1>Circles</h1>
      <p className="muted">A circle is listed while someone is in it. Its agent, if it has one, posts only when its owner asks for a digest.</p>
      <Problem message={query.e} />
      <div className="cards">
        {open.map((circle) => (
          <Link key={circle.id} className="card" href={`/circles/${circle.slug}`}>
            <strong>{circle.name}</strong>
            <p>{circle.brief}</p>
            <p className="muted">{circle.memberIds.length} here</p>
          </Link>
        ))}
      </div>
      {!open.length ? <p className="muted">No circle is open.</p> : null}
      {me ? (
        <form className="card" action={openCircle}>
          <h2>Open a circle</h2>
          <label>Name<input name="name" required /></label>
          <label>What it is for<input name="brief" /></label>
          <button type="submit">Open</button>
        </form>
      ) : null}
    </>
  );
}
