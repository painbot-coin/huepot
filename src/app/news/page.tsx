import type { Metadata } from "next";
import Link from "next/link";
import { countNews, listNews, newsOutlets, talkHref } from "@/lib/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The wire",
  description:
    "Betting-game headlines gathered by the house: odds, lines, new tables and the desks that write about them. Every line links out to whoever wrote it, and Talk opens it on the wing.",
};

const PAGE = 24;

function ago(at: number) {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Filters and paging live in the URL rather than in client state: a filtered
 * wire can be linked to, it survives a reload, and it works with no
 * JavaScript at all. `before` walks back by published time rather than by an
 * offset, so a headline arriving mid-read cannot shuffle the next page.
 */
function href(params: { tag?: string; source?: string; before?: number }) {
  const search = new URLSearchParams();
  search.set("tag", params.tag || "all");
  if (params.source) search.set("source", params.source);
  if (params.before) search.set("before", String(params.before));
  return `/news?${search.toString()}`;
}

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

  const [items, total, outlets] = await Promise.all([
    listNews({ limit: PAGE + 1, tag, source, before }),
    countNews({ tag, source }),
    newsOutlets(),
  ]);

  // One extra row is fetched purely to know whether an older page exists,
  // which is cheaper than counting what is left.
  const hasOlder = items.length > PAGE;
  const page = hasOlder ? items.slice(0, PAGE) : items;
  const oldest = page[page.length - 1]?.publishedAt;
  const filtered = Boolean(tag || source);

  return (
    <main className="prose-page">
      <p className="hall-kicker">The wire</p>
      <h1 className="font-display text-4xl text-white">Betting on the games</h1>
      <p>
        Odds, lines, new tables and the desks that write about them, newest first.
        Each headline carries the outlet&apos;s own summary and picture and a link
        out to whoever wrote it. Talk takes the same line onto the wing. The house
        never keeps the article itself.
      </p>

      <nav aria-label="Filter the wire" className="wire-filters">
        <Link className={`wire-chip ${!tag ? "is-on" : ""}`} href={href({ tag: "all", source })}>
          All games
        </Link>
        <Link className={`wire-chip ${tag === "sport" ? "is-on" : ""}`} href={href({ tag: "sport", source })}>
          Sports betting
        </Link>
        <Link className={`wire-chip ${tag === "casino" ? "is-on" : ""}`} href={href({ tag: "casino", source })}>
          Casino games
        </Link>
      </nav>

      {outlets.length ? (
        <nav aria-label="Filter by outlet" className="wire-filters wire-outlets">
          {outlets.map((outlet) => (
            <Link
              className={`wire-chip ${source === outlet.source ? "is-on" : ""}`}
              href={
                source === outlet.source
                  ? href({ tag })
                  : href({ tag, source: outlet.source })
              }
              key={outlet.source}
            >
              {outlet.source} <span className="wire-chip-n">{outlet.count}</span>
            </Link>
          ))}
        </nav>
      ) : null}

      <p className="wire-count">
        {total === 0
          ? "Nothing on the wire under that filter."
          : `${total.toLocaleString()} headline${total === 1 ? "" : "s"}${
              !tag && !source
                ? " about betting games"
                : tag === "sport" && !source
                  ? " on sports betting"
                  : tag === "casino" && !source
                    ? " on casino games"
                    : " match"
            }${before ? `, showing older ones` : ""}.`}
        {filtered ? (
          <>
            {" "}
            <Link href={href({ tag: "all" })}>Show everything</Link>
          </>
        ) : null}
      </p>

      {page.length ? (
        <ul className="wire-list">
          {page.map((item) => (
            <li className={item.image ? "has-shot" : undefined} key={item.id}>
              {item.image ? (
                // The outlet's own picture. referrerPolicy keeps them from
                // seeing which of our pages a reader came from.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="wire-shot"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  src={item.image}
                />
              ) : null}
              <div className="wire-body">
                <a href={item.url} rel="noopener noreferrer nofollow" target="_blank">
                  {item.title}
                </a>
                {item.summary ? <p className="wire-sum">{item.summary}</p> : null}
                <span className="wire-meta">
                  <Link className="wire-src" href={href({ tag, source: item.source })}>
                    {item.source}
                  </Link>
                  {" · "}
                  {ago(item.publishedAt)}
                  {item.talkId && talkHref(item.talkId) ? (
                    <>
                      {" · "}
                      <Link className="wire-talk" href={talkHref(item.talkId)}>
                        Talk
                      </Link>
                    </>
                  ) : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-zinc-500">
          {filtered
            ? "No headlines from that outlet yet."
            : "The wire is quiet. Headlines land within a quarter of an hour of the house starting up."}
        </p>
      )}

      <div className="wire-pager">
        {before ? (
          <Link className="chip-btn chip-btn-ghost" href={href({ tag, source })}>
            Back to newest
          </Link>
        ) : null}
        {hasOlder && oldest ? (
          <Link className="chip-btn chip-btn-ghost" href={href({ tag, source, before: oldest })}>
            Older headlines
          </Link>
        ) : null}
      </div>

      <p className="mt-8">
        <Link className="chip-btn" href="/rooms/classic">
          Sit Classic
        </Link>
      </p>
    </main>
  );
}
