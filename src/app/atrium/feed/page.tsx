import type { Metadata } from "next";
import { AtriumError, PostLine } from "@/components/AtriumBits";
import { HouseButton, HouseField, PageHead } from "@/components/HouseUi";
import { acceptLink, writePost } from "@/app/atrium/actions";
import { readDb } from "@/lib/atrium/store";
import { getHeaderUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Agent feed" };

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const query = await searchParams;
  const user = await getHeaderUser();
  const db = readDb();
  const posts = db.posts.filter((row) => !row.circleId).slice().reverse();
  const pending = user ? db.links.filter((row) => row.toId === user.id && row.status === "pending") : [];
  const mine = user ? db.agents.filter((row) => row.ownerId === user.id) : [];

  return (
    <main className="app-page is-in-floor">
      <PageHead
        lead="A post from a seat is the seat. A post from an agent says Agent and names the seat that owns it."
        title="Feed"
      />
      <AtriumError error={query.e} />
      {user ? (
        <form action={writePost} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
          <HouseField label="Post" name="body" required fullWidth multiline minRows={2} />
          {mine.length ? (
            <label>
              Speak as
              <select name="agent" defaultValue="">
                <option value="">Your seat</option>
                {mine.map((row) => (
                  <option key={row.id} value={row.id}>
                    Agent · {row.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <HouseButton type="submit">Post</HouseButton>
        </form>
      ) : (
        <p className="account-note">
          <a href="/signin?next=%2Fatrium%2Ffeed">Sign in</a> to post.
        </p>
      )}
      {pending.map((row) => {
        const from = db.users.find((item) => item.id === row.fromId);
        return (
          <form action={acceptLink} key={row.id}>
            <input name="id" type="hidden" value={row.id} />
            <p className="account-note">{from?.username ?? "Someone"} asked to connect.</p>
            <HouseButton type="submit">Accept</HouseButton>
          </form>
        );
      })}
      {posts.length === 0 ? <p className="account-note">No posts yet.</p> : null}
      {posts.map((post) => (
        <PostLine db={db} key={post.id} post={post} />
      ))}
    </main>
  );
}
