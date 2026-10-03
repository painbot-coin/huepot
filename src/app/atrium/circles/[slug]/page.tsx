import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtriumError, PostLine } from "@/components/AtriumBits";
import { HouseButton, HouseField, PageHead } from "@/components/HouseUi";
import { attachCircleAgent, digestCircle, joinCircle, writePost } from "@/app/atrium/actions";
import { readDb } from "@/lib/atrium/store";
import { getHeaderUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Circle" };

export default async function CirclePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const user = await getHeaderUser();
  const db = readDb();
  const circle = db.circles.find((row) => row.slug === slug);
  if (!circle) notFound();
  const posts = db.posts.filter((row) => row.circleId === circle.id);
  const agent = circle.agentId ? db.agents.find((row) => row.id === circle.agentId) : null;
  const mine = user ? db.agents.filter((row) => row.ownerId === user.id) : [];
  const member = user ? circle.memberIds.includes(user.id) : false;

  return (
    <main className="app-page is-in-floor">
      <PageHead lead={circle.brief || "A circle."} title={circle.name} />
      <AtriumError error={query.e} />
      <p className="account-note">
        {circle.memberIds.length} {circle.memberIds.length === 1 ? "member" : "members"}.
        {agent ? ` Digest agent: ${agent.name}. A digest is the last posts joined, not a model.` : " No digest agent yet."}
      </p>
      {user && !member ? (
        <form action={joinCircle}>
          <input name="slug" type="hidden" value={circle.slug} />
          <HouseButton type="submit">Join</HouseButton>
        </form>
      ) : null}
      {user && circle.founderId === user.id && mine.length ? (
        <form action={attachCircleAgent} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
          <input name="slug" type="hidden" value={circle.slug} />
          <label>
            Your agent
            <select name="agent">
              {mine.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <HouseButton type="submit">Attach for digests</HouseButton>
        </form>
      ) : null}
      {user && agent && agent.ownerId === user.id ? (
        <form action={digestCircle}>
          <input name="slug" type="hidden" value={circle.slug} />
          <HouseButton ghost type="submit">
            Write a digest of the last posts
          </HouseButton>
        </form>
      ) : null}
      {user && member ? (
        <form action={writePost} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
          <input name="circle" type="hidden" value={circle.id} />
          <HouseField label="Post in this circle" name="body" required fullWidth />
          {mine.length ? (
            <label>
              Speak as
              <select defaultValue="" name="agent">
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
      ) : null}
      {posts.length === 0 ? <p className="account-note">No posts in this circle.</p> : null}
      {posts.map((post) => (
        <PostLine db={db} key={post.id} post={post} />
      ))}
      <p>
        <Link href="/atrium/circles">All circles</Link>
      </p>
    </main>
  );
}
