import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HouseButton } from "@/components/HouseUi";
import { HouseFloor } from "@/components/HouseFloor";
import { NewsStory } from "@/components/NewsStory";
import { getHeaderUser } from "@/lib/auth";
import { floorYou } from "@/lib/house-you";
import { getNews, listRelatedNews, newsHref } from "@/lib/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getNews(id);
  if (!item) return { title: "News" };
  return {
    title: item.title,
    description: item.summary || `${item.source} on Huepot.`,
  };
}

export default async function NewsStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getNews(id);
  if (!item) notFound();
  const [related, user] = await Promise.all([
    listRelatedNews(item.id, item.tag),
    getHeaderUser(),
  ]);

  return (
    <HouseFloor
      extra={[
        { href: "/news", label: "News" },
        { href: newsHref(item.id), label: "Story", match: true },
      ]}
      kicker="News"
      side={
        <div>
          <p className="lobby-label">More headlines</p>
          <p className="account-note">
            The outlet&apos;s own summary and picture. No scraped article body.
          </p>
          <div className="li-profile-act">
            <HouseButton ghost href="/news">
              All news
            </HouseButton>
            <HouseButton href="/rooms/classic">Play Classic</HouseButton>
          </div>
        </div>
      }
      you={floorYou(user)}
    >
      <main className="app-page is-in-floor">
        <NewsStory
          item={{
            id: item.id,
            title: item.title,
            summary: item.summary,
            source: item.source,
            image: item.image,
            publishedAt: item.publishedAt,
            tag: item.tag,
            talkId: item.talkId,
          }}
          related={related.map((row) => ({
            id: row.id,
            title: row.title,
            summary: row.summary,
            source: row.source,
            image: row.image,
            publishedAt: row.publishedAt,
            tag: row.tag,
            talkId: row.talkId,
          }))}
        />
      </main>
    </HouseFloor>
  );
}
