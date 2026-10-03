import type { Metadata } from "next";
import { HouseButton } from "@/components/HouseUi";
import { HouseFloor } from "@/components/HouseFloor";
import { NewsDesk } from "@/components/NewsDesk";
import { getHeaderUser } from "@/lib/auth";
import { floorYou } from "@/lib/house-you";
import { countNews, listNews, newsOutlets } from "@/lib/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "News",
  description:
    "Betting-game headlines gathered by Huepot: odds, lines, new tables and the desks that write about them. Each story opens here. Talk is on the network.",
};

const PAGE = 24;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; source?: string; before?: string }>;
}) {
  const raw = await searchParams;
  const asked = raw.tag ?? "";
  const tag = asked === "sport" || asked === "casino" ? asked : "";
  const source = (raw.source ?? "").slice(0, 40);
  const before = Number(raw.before);

  const [items, total, outlets, user] = await Promise.all([
    listNews({ limit: PAGE + 1, tag, source, before }),
    countNews({ tag, source }),
    newsOutlets(),
    getHeaderUser(),
  ]);

  const hasOlder = items.length > PAGE;
  const page = hasOlder ? items.slice(0, PAGE) : items;
  const oldest = page[page.length - 1]?.publishedAt;

  return (
    <HouseFloor
      kicker="News"
      side={
        <div>
          <p className="lobby-label">Live table</p>
          <p className="account-note">
            News stays on Huepot. The pot stays on Classic. Same price on every
            color.
          </p>
          <div className="li-profile-act">
            <HouseButton href="/rooms/classic">Play Classic</HouseButton>
            <HouseButton ghost href="/jobs">
              Jobs
            </HouseButton>
          </div>
        </div>
      }
      you={floorYou(user)}
    >
      <main className="app-page is-in-floor">
        <NewsDesk
          before={Boolean(before)}
          hasOlder={hasOlder}
          items={page.map((item) => ({
            id: item.id,
            title: item.title,
            summary: item.summary,
            source: item.source,
            image: item.image,
            publishedAt: item.publishedAt,
            tag: item.tag,
            talkId: item.talkId,
          }))}
          oldest={oldest}
          outlets={outlets.map((row) => ({ source: row.source, count: row.count }))}
          source={source}
          tag={tag}
          total={total}
        />
      </main>
    </HouseFloor>
  );
}
