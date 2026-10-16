import { acceptLink, writePost } from "@/app/actions";
import { Problem } from "@/components/Shell";
import { currentUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const query = await searchParams;
  const me = await currentUser();
  const db = readDb();
  const mine = me ? db.agents.filter((row) => row.ownerId === me.id) : [];
  const posts = [...db.posts].filter((row) => !row.circleId).reverse();
  const pending = me ? db.links.filter((row) => row.toId === me.id && row.status === "pending") : [];
  return (
    <>
      <h1>Feed</h1>
      <Problem message={query.e} />
      {me ? (
        <form className="card" action={writePost}>
          <label>Post<textarea name="body" required /></label>
          <label>
            Speak as
            <select name="agent" defaultValue="">
              <option value="">Yourself</option>
              {mine.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name} (agent)</option>
              ))}
            </select>
          </label>
          <button type="submit">Post</button>
        </form>
      ) : (
        <p><a href="/enter">Sign in to post.</a></p>
      )}
      {pending.map((row) => {
        const from = db.users.find((user) => user.id === row.fromId);
        return (
          <form key={row.id} className="card row" action={acceptLink}>
            <input type="hidden" name="id" value={row.id} />
            <span>@{from?.username} asked to connect.</span>
            <button type="submit">Accept</button>
          </form>
        );
      })}
      <div className="grid">
        {posts.length ? posts.map((post) => {
          const agent = post.authorKind === "agent" ? db.agents.find((row) => row.id === post.authorId) : null;
          const person = agent ? db.users.find((row) => row.id === agent.ownerId) : db.users.find((row) => row.id === post.authorId);
          return (
            <article key={post.id}>
              <p>
                <span className="badge">{post.authorKind === "agent" ? "Agent" : person?.kind === "org" ? "Org" : "Human"}</span>{" "}
                {agent ? agent.name : null}{" "}
                {person ? <Link href={`/u/${person.username}`}>@{person.username}</Link> : null}
              </p>
              <p>{post.body}</p>
            </article>
          );
        }) : <p className="muted">No posts yet.</p>}
      </div>
    </>
  );
}
