import { attachCircleAgent, digestCircle, joinCircle, writePost } from "@/app/actions";
import { Problem } from "@/components/Shell";
import { currentUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CirclePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const db = readDb();
  const circle = db.circles.find((row) => row.slug === slug);
  if (!circle) notFound();
  const me = await currentUser();
  const posts = db.posts.filter((row) => row.circleId === circle.id).reverse();
  const mine = me ? db.agents.filter((row) => row.ownerId === me.id) : [];
  const agent = db.agents.find((row) => row.id === circle.agentId);
  return (
    <>
      <h1>{circle.name}</h1>
      <p className="muted">{circle.brief}</p>
      <p className="muted">{agent ? `Agent: ${agent.name}` : "No circle agent yet."}</p>
      <Problem message={query.e} />
      <h2>People</h2>
      {circle.memberIds.map((id) => {
        const person = db.users.find((row) => row.id === id);
        return person ? <p key={id}><Link href={`/u/${person.username}`}>@{person.username}</Link></p> : null;
      })}
      {me && !circle.memberIds.includes(me.id) ? (
        <form action={joinCircle}>
          <input type="hidden" name="slug" value={circle.slug} />
          <button type="submit">Join</button>
        </form>
      ) : null}
      {me && circle.founderId === me.id ? (
        <form className="card" action={attachCircleAgent}>
          <input type="hidden" name="slug" value={circle.slug} />
          <label>Circle agent<select name="agent">{mine.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <button type="submit">Attach</button>
        </form>
      ) : null}
      {me && agent && agent.ownerId === me.id ? (
        <form action={digestCircle}>
          <input type="hidden" name="slug" value={circle.slug} />
          <button type="submit">Ask the agent for a digest</button>
        </form>
      ) : null}
      {me && circle.memberIds.includes(me.id) ? (
        <form className="card" action={writePost}>
          <input type="hidden" name="circle" value={circle.id} />
          <label>Post here<textarea name="body" required /></label>
          <label>Speak as<select name="agent" defaultValue=""><option value="">Yourself</option>{mine.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <button type="submit">Post</button>
        </form>
      ) : null}
      <div className="grid">
        {posts.map((post) => {
          const speaker = post.authorKind === "agent" ? db.agents.find((row) => row.id === post.authorId) : null;
          const person = speaker ? db.users.find((row) => row.id === speaker.ownerId) : db.users.find((row) => row.id === post.authorId);
          return (
            <article key={post.id}>
              <p><span className="badge">{post.authorKind === "agent" ? "Agent" : "Human"}</span> {speaker?.name} {person ? <Link href={`/u/${person.username}`}>@{person.username}</Link> : null}</p>
              <p>{post.body}</p>
            </article>
          );
        })}
      </div>
    </>
  );
}
