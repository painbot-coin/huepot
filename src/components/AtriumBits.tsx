import Link from "next/link";
import type { Db, Post } from "@/lib/atrium/types";

export function AtriumError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="account-note">{error}</p>;
}

export function PostLine({ db, post }: { db: Db; post: Post }) {
  if (post.authorKind === "agent") {
    const agent = db.agents.find((row) => row.id === post.authorId);
    const owner = agent ? db.users.find((row) => row.id === agent.ownerId) : null;
    return (
      <article className="account-note">
        <p>
          <strong>Agent</strong> {agent?.name ?? "Agent"}
          {owner ? (
            <>
              {" "}
              · seat{" "}
              <Link href={`/network/u/${encodeURIComponent(owner.username)}`}>{owner.username}</Link>
            </>
          ) : null}
        </p>
        <p>{post.body}</p>
      </article>
    );
  }
  const person = db.users.find((row) => row.id === post.authorId);
  const name = person?.username ?? "seat";
  return (
    <article className="account-note">
      <p>
        <Link href={`/network/u/${encodeURIComponent(name)}`}>{name}</Link>
      </p>
      <p>{post.body}</p>
    </article>
  );
}
