import { createHash } from "node:crypto";
import {
  bettingGameKind,
  isBettingGameNews,
  isBettingSpam,
  isHallLine,
  wireHeadline,
  type BettingKind,
  type BettingTrust,
} from "@/lib/betting-game";
import { prisma } from "@/lib/db";

/**
 * Betting-game headlines, fetched on a timer and put on the wire.
 *
 * This is a betting house. The tape is odds, lines, new tables and the desks
 * that write about betting on games — not football scores, not Bitcoin
 * prices, and not who just bought a licence. Those were what the first
 * scrapers gathered, and they buried the thing a player here actually reads.
 *
 * Two kinds of source, both probed from the droplet before they went in:
 * betting desks with their own feeds, and topic scrapes that search the
 * open web for betting-game news. A desk is trusted to stay on subject; a
 * scrape has to read as a betting game or it is dropped. Never an article
 * body — a link is not republishing.
 *
 * Writes straight to its own table and never touches the in-memory store, so a
 * fetch cannot sit in the lane that settles rounds.
 */

export type NewsTag = BettingKind | "betting";

export type NewsSource = {
  name: string;
  url: string;
  tag: BettingKind;
  /** house = a betting desk. strict = a mixed scrape that must prove itself. */
  trust?: BettingTrust;
  /** Topic scrapes name the publisher per item and carry no real summary. */
  wire?: boolean;
  take?: number;
};

/**
 * Every feed here answered `scripts/feed-probe.mjs` from the droplet before
 * being added, with items that parse. Guessing at a URL and shipping it is
 * how a wire ends up quietly half dead.
 */
export const NEWS_SOURCES: NewsSource[] = [
  {
    name: "Sports betting tape",
    url: "https://news.google.com/rss/search?q=sports+betting+odds&hl=en-US&gl=US&ceid=US:en",
    tag: "sport",
    trust: "strict",
    wire: true,
    take: 8,
  },
  {
    name: "Casino games tape",
    url: "https://news.google.com/rss/search?q=%22slot+launch%22+OR+WSOP+OR+%22poker+tournament%22+OR+%22live+dealer%22+OR+%22new+slot%22&hl=en-US&gl=US&ceid=US:en",
    tag: "casino",
    trust: "strict",
    wire: true,
    take: 6,
  },
  { name: "NY Post Betting", url: "https://nypost.com/tag/sports-betting/feed/", tag: "sport", trust: "house" },
  { name: "CBS Sports Betting", url: "https://www.cbssports.com/rss/headlines/betting/", tag: "sport", trust: "house" },
  { name: "Legal Sports Report", url: "https://www.legalsportsreport.com/feed/", tag: "sport", trust: "house" },
  { name: "Legal Sports Betting", url: "https://www.legalsportsbetting.com/feed/", tag: "sport", trust: "house" },
  { name: "Sports Betting Dime", url: "https://www.sportsbettingdime.com/feed/", tag: "sport", trust: "house" },
  { name: "Betfair", url: "https://betting.betfair.com/index.xml", tag: "sport", trust: "house" },
  { name: "Casino.org", url: "https://www.casino.org/news/feed/", tag: "sport", trust: "strict" },
  { name: "Punter2Pro", url: "https://punter2pro.com/feed/", tag: "casino", trust: "house" },
  { name: "VegasSlotsOnline", url: "https://www.vegasslotsonline.com/news/feed/", tag: "casino", trust: "house" },
  { name: "OnlinePoker", url: "https://www.onlinepoker.net/feed/", tag: "casino", trust: "house" },
  { name: "CasinoBeats", url: "https://casinobeats.com/feed/", tag: "casino", trust: "strict" },
  { name: "SBC News", url: "https://sbcnews.co.uk/feed/", tag: "sport", trust: "strict" },
];

/** Per source, per run. A topic scrape of a hundred would bury the hall. */
const PER_SOURCE = 6;
/** Enough for a card to be worth reading, short enough not to be the article. */
const SUMMARY_MAX = 320;
const POLL_MS = 15 * 60 * 1000;
const AGENT = "HuepotNewsBot/1.0 (+https://huepot.net)";

export type NewsItem = {
  id: string;
  source: string;
  tag: string;
  title: string;
  /** The publisher's own syndication summary. Never the article body. */
  summary: string;
  url: string;
  image: string;
  publishedAt: number;
  /**
   * The Wing card for this headline, when the house has posted it.
   * Empty until then, so Talk is not offered for a discussion that is not there.
   */
  talkId?: string;
};

/**
 * Where a headline is discussed. The id is the house's, so anything that is
 * not a post id is dropped rather than being written into a link.
 */
export function talkHref(talkId: string) {
  const id = talkId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80);
  if (!id.startsWith("wire-") || id.length < 6) return "";
  return `/network?post=${encodeURIComponent(id)}`;
}

let ready = false;

export async function ensureNewsTables() {
  if (ready) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS NewsItem (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      tag TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      publishedAt BIGINT NOT NULL,
      fetchedAt BIGINT NOT NULL,
      hidden INTEGER NOT NULL DEFAULT 0
    )
  `);
  try {
    await prisma.$executeRawUnsafe("ALTER TABLE NewsItem ADD COLUMN summary TEXT NOT NULL DEFAULT ''");
  } catch {
    /* column already exists */
  }
  try {
    // Defaults to 'live' so the rows already on the wire stay on it. New rows
    // are inserted as 'held' explicitly, which is what makes this a gate.
    await prisma.$executeRawUnsafe(
      "ALTER TABLE NewsItem ADD COLUMN status TEXT NOT NULL DEFAULT 'live'",
    );
  } catch {
    /* column already exists */
  }
  await retireOffTopicNews();
  ready = true;
  // Promo copy that landed before the spam check knew those titles.
  await retireSpamNews();
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  nbsp: " ",
};

function decode(raw: string) {
  return raw
    .replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, (_, name: string) => ENTITIES[name] ?? " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

/** One tag's text, whether it arrives bare or wrapped in CDATA. */
function tagText(block: string, name: string) {
  const match = block.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"),
  );
  if (!match) return "";
  const inner = match[1] ?? "";
  const cdata = inner.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return decode(cdata ? cdata[1] : inner);
}

function attr(block: string, tag: string, name: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*\\s${name}="([^"]+)"`, "i"));
  return match ? decode(match[1]) : "";
}

/** Feed summaries usually arrive as HTML. Keep the words, drop the markup. */
function stripTags(raw: string) {
  return decode(raw.replace(/<[^>]*>/g, " "));
}

/**
 * The publisher's own one-paragraph summary, which is the thing RSS exists to
 * syndicate. Still never the article body: `content:encoded` and Atom's
 * `<content>` often carry the whole piece, so they are not read here.
 *
 * Feeds pad these. Some open by repeating the outlet name and the headline
 * before saying anything, and WordPress ones close with a "this post first
 * appeared on" credit. Both are noise beside a card that already shows the
 * headline and the source, so they come off.
 */
function summaryOf(block: string, title: string, sourceName: string) {
  const raw = tagText(block, "description") || tagText(block, "summary");
  if (!raw) return "";
  let text = stripTags(raw);

  // Trailing syndication credit, and anything after it. WordPress desks
  // close with "The post … appeared first on", which is the same noise.
  text = text.replace(/\s*This (post|article)\b[\s\S]*$/i, "").trim();
  text = text.replace(/\s*The post\b[\s\S]*$/i, "").trim();

  // A leading repeat of the outlet, then of the headline. Order matters:
  // "Bitcoin Magazine Capital B Buys 376 Bitcoins…" is both, in that order.
  for (const prefix of [sourceName, title]) {
    const trimmed = prefix.trim();
    if (trimmed && text.toLowerCase().startsWith(trimmed.toLowerCase())) {
      text = text.slice(trimmed.length).replace(/^[\s\-–—:.]+/, "").trim();
    }
  }
  if (!text) return "";
  if (text.length <= SUMMARY_MAX) return text;
  // Cut on a word, not mid-syllable, and mark that there is more to read.
  const cut = text.slice(0, SUMMARY_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:]+$/, "")}…`;
}

/**
 * Tracking parameters are dropped: they are noise, and they would make the same
 * article look like a new one every time the campaign string changed.
 */
export function cleanUrl(raw: string) {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref$|source$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

/** Feeds put the picture in three different places; take whichever is there. */
function imageOf(block: string) {
  const media = attr(block, "media:content", "url") || attr(block, "media:thumbnail", "url");
  if (media) return cleanUrl(media);
  const enclosure = attr(block, "enclosure", "url");
  if (enclosure) return cleanUrl(enclosure);
  const inDescription = block.match(/<img[^>]*\ssrc="([^"]+)"/i);
  return inDescription ? cleanUrl(inDescription[1]) : "";
}

export function parseFeed(xml: string, source: NewsSource): NewsItem[] {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  const out: NewsItem[] = [];
  const take = Math.max(1, Math.min(20, source.take ?? PER_SOURCE));
  const trust = source.trust ?? "strict";
  for (const block of blocks) {
    const rawTitle = tagText(block, "title");
    // Topic scrapes name the publisher in a <source> tag, and again at the
    // end of the title. The card already has a source line, so the suffix
    // comes off.
    const publisher = source.wire ? tagText(block, "source") : "";
    const title = wireHeadline(rawTitle, publisher);
    // The guid is usually the clean article URL; the link often carries a
    // campaign string. Atom keeps the URL in a link href instead. Topic
    // scrapes use a non-URL guid, so the link is the one that counts.
    const guid = tagText(block, "guid");
    const link = tagText(block, "link") || attr(block, "link", "href");
    const url = cleanUrl(/^https?:\/\//i.test(guid) ? guid : link);
    if (!title || !url) continue;
    const summary = source.wire ? "" : summaryOf(block, title, publisher || source.name);
    if (!isBettingGameNews(title, summary, trust)) continue;
    const when = tagText(block, "pubDate") || tagText(block, "published") || tagText(block, "updated");
    const at = when ? Date.parse(when) : Number.NaN;
    out.push({
      id: createHash("sha256").update(url).digest("hex").slice(0, 32),
      source: (publisher || source.name).slice(0, 40),
      tag: bettingGameKind(title, summary, source.tag),
      title: title.slice(0, 200),
      summary,
      url,
      image: imageOf(block),
      publishedAt: Number.isFinite(at) ? at : Date.now(),
    });
    if (out.length >= take) break;
  }
  return out;
}

async function saveItems(items: NewsItem[]) {
  await ensureNewsTables();
  let added = 0;
  const now = Date.now();
  for (const item of items) {
    // The same game write-up arrives from a desk and from the tape under
    // different URLs. One headline on the wire is enough.
    const seen = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM NewsItem WHERE title = ${item.title} LIMIT 1
    `;
    if (seen.length) continue;
    // Keyed by the hash of the URL, so the same article twice is one row and
    // the dedupe needs no extra query.
    const done = await prisma.$executeRaw`
      INSERT OR IGNORE INTO NewsItem
        (id, source, tag, title, summary, url, image, publishedAt, fetchedAt, hidden, status)
      VALUES (${item.id}, ${item.source}, ${item.tag}, ${item.title}, ${item.summary}, ${item.url},
              ${item.image}, ${item.publishedAt}, ${now}, 0, 'live')
    `;
    added += done;
    // IGNORE skips a row the feed offers again, so anything stored before
    // summaries existed would keep an empty one forever. The feed is the
    // authority on its own summary, so refresh it while the article is still
    // being offered — that also heals rows saved with feed boilerplate in
    // them before it was being stripped.
    if (!done && item.summary) {
      await prisma.$executeRaw`
        UPDATE NewsItem SET summary = ${item.summary}
         WHERE id = ${item.id} AND summary <> ${item.summary}
      `;
      // A card already on the feed carries a copy of the old text, so it gets
      // the same correction rather than being left reading worse than the wire.
      try {
        await prisma.$executeRaw`
          UPDATE NetworkPost SET body = ${item.summary}
           WHERE link = ${item.url} AND body <> ${item.summary}
        `;
      } catch {
        /* the posts table may not exist yet on a fresh database */
      }
    }
  }
  return added;
}

/**
 * How many headlines reach the Wing feed per fetch. The wire itself takes
 * everything; the feed is a place people read, and forty cards a quarter of an
 * hour is not reading, it is a firehose that would bury any player who ever
 * writes something.
 */
const WING_PER_RUN = 12;

/**
 * Puts the newest headlines into the Wing feed as link cards, authored by the
 * house. They are real posts, so a player can like and comment on them, which
 * is the whole point of them being in a feed rather than a list.
 *
 * Skips anything already posted. A tape item often has no publisher summary;
 * the card still has a headline, a source and a link, which is enough to talk
 * about. Repeating the title as the body is worse than leaving it blank.
 */
export async function postNewsToWing(limit = WING_PER_RUN) {
  await ensureNewsTables();
  const { ensureSocialTables } = await import("@/lib/social");
  const { HOUSE_USER_ID } = await import("@/lib/house");
  await ensureSocialTables();

  const rows = await prisma.$queryRaw<
    { id: string; source: string; title: string; summary: string; url: string; image: string }[]
  >`
    SELECT n.id, n.source, n.title, n.summary, n.url, n.image
      FROM NewsItem n
     WHERE n.hidden = 0 AND n.status = 'live'
       AND n.tag IN ('sport', 'casino', 'betting')
       AND NOT EXISTS (SELECT 1 FROM NetworkPost p WHERE p.link = n.url)
     ORDER BY n.publishedAt DESC
     LIMIT ${Math.max(1, Math.min(20, Math.floor(limit)))}
  `;

  let posted = 0;
  for (const row of rows) {
    // The post id is derived from the article, so the same headline can never
    // be posted twice even if the guard above is raced.
    const id = `wire-${row.id}`;
    const done = await prisma.$executeRaw`
      INSERT OR IGNORE INTO NetworkPost (id, userId, body, link, image, title, source, createdAt)
      VALUES (${id}, ${HOUSE_USER_ID}, ${row.summary}, ${row.url}, ${row.image},
              ${row.title}, ${row.source}, ${Date.now()})
    `;
    posted += Number(done);
  }
  return posted;
}

export type FetchReport = { source: string; found: number; added: number; error?: string };

export async function fetchNewsOnce(): Promise<FetchReport[]> {
  const reports: FetchReport[] = [];
  for (const source of NEWS_SOURCES) {
    try {
      const response = await fetch(source.url, {
        headers: { "user-agent": AGENT, accept: "application/rss+xml, application/xml, text/xml" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`http ${response.status}`);
      const items = parseFeed(await response.text(), source);
      reports.push({ source: source.name, found: items.length, added: await saveItems(items) });
    } catch (error) {
      // One dead feed must not stop the others.
      reports.push({
        source: source.name,
        found: 0,
        added: 0,
        error: error instanceof Error ? error.message : "failed",
      });
    }
  }
  // Drop signup offers that were already stored, then post what is left.
  // The feed gets its cards from the same run, so a fetch is one step rather
  // than a thing that needs a second trigger nobody remembers to pull.
  try {
    await retireSpamNews();
    await postNewsToWing();
  } catch {
    /* a feed card failing must not fail the fetch */
  }
  return reports;
}

type Row = Omit<NewsItem, "publishedAt" | "talkId"> & {
  publishedAt: string;
  talkId?: string | null;
};

export type NewsQuery = {
  limit?: number;
  /** "sport" or "casino"; empty means every betting-game headline. */
  tag?: string;
  /** An outlet name; empty means all of them. */
  source?: string;
  /** Only headlines published before this, which is how paging walks back. */
  before?: number;
};

/**
 * What the hall sees: released, and not pulled since.
 *
 * Every filter stays a bound parameter rather than being pasted into the
 * statement — each condition is written so it does nothing when its filter is
 * empty. That keeps a user-supplied source name out of the SQL text entirely,
 * which is worth more than the small awkwardness of the clause.
 */
export async function listNews(input: NewsQuery | number = {}) {
  await ensureNewsTables();
  // Talk is a join onto the feed card. The social tables are created here so
  // a first request after a wipe does not fail the hall tape.
  const { ensureSocialTables } = await import("@/lib/social");
  await ensureSocialTables();
  const query: NewsQuery = typeof input === "number" ? { limit: input } : input;
  const take = Math.max(1, Math.min(60, Math.floor(query.limit ?? 24)));
  const tag = (query.tag ?? "").trim();
  const source = (query.source ?? "").trim();
  const before = Number.isFinite(query.before) ? Math.max(0, Math.floor(query.before!)) : 0;
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT n.id, n.source, n.tag, n.title, n.summary, n.url, n.image,
           CAST(n.publishedAt AS TEXT) AS publishedAt,
           COALESCE(p.id, '') AS talkId
      FROM NewsItem n
      LEFT JOIN NetworkPost p ON p.id = ('wire-' || n.id)
     WHERE n.hidden = 0 AND n.status = 'live'
       AND n.tag IN ('sport', 'casino', 'betting')
       AND (${tag} = '' OR n.tag = ${tag})
       AND (${source} = '' OR n.source = ${source})
       AND (${before} = 0 OR n.publishedAt < ${before})
     ORDER BY n.publishedAt DESC LIMIT ${take}
  `;
  return rows.map((row) => ({
    ...row,
    publishedAt: Number(row.publishedAt),
    talkId: (row.talkId ?? "").trim(),
  }));
}

/**
 * The hall strip. Newest first among lines a stranger should see — a price,
 * a market, a new table — then fill from the rest of the tape if the last
 * day has fewer than four of those.
 */
export async function listHallNews(limit = 4) {
  const take = Math.max(1, Math.min(8, Math.floor(limit)));
  const pool = await listNews({ limit: 24 });
  const lines = pool.filter((row) => isHallLine(row.title, row.summary));
  const rest = pool.filter((row) => !isHallLine(row.title, row.summary));
  return [...lines, ...rest].slice(0, take);
}

/** How many headlines match, so the page can say what it is showing part of. */
export async function countNews(query: NewsQuery = {}) {
  await ensureNewsTables();
  const tag = (query.tag ?? "").trim();
  const source = (query.source ?? "").trim();
  const rows = await prisma.$queryRaw<{ n: number | bigint }[]>`
    SELECT COUNT(*) AS n FROM NewsItem
     WHERE hidden = 0 AND status = 'live'
       AND tag IN ('sport', 'casino', 'betting')
       AND (${tag} = '' OR tag = ${tag})
       AND (${source} = '' OR source = ${source})
  `;
  return Number(rows[0]?.n ?? 0);
}

export type NewsOutlet = { source: string; tag: string; count: number };

/** The outlets that have actually published something, with how much. */
export async function newsOutlets(): Promise<NewsOutlet[]> {
  await ensureNewsTables();
  const rows = await prisma.$queryRaw<{ source: string; tag: string; n: number | bigint }[]>`
    SELECT source, MIN(tag) AS tag, COUNT(*) AS n FROM NewsItem
     WHERE hidden = 0 AND status = 'live'
       AND tag IN ('sport', 'casino', 'betting')
     GROUP BY source ORDER BY n DESC
  `;
  return rows.map((row) => ({ source: row.source, tag: row.tag, count: Number(row.n) }));
}

/** What is waiting on a decision. Oldest first, so nothing sits forgotten. */
export async function listHeldNews(limit = 60) {
  await ensureNewsTables();
  const take = Math.max(1, Math.min(120, Math.floor(limit)));
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT id, source, tag, title, summary, url, image, CAST(publishedAt AS TEXT) AS publishedAt
      FROM NewsItem WHERE hidden = 0 AND status = 'held'
     ORDER BY publishedAt ASC LIMIT ${take}
  `;
  return rows.map((row) => ({ ...row, publishedAt: Number(row.publishedAt) }));
}

export async function countHeldNews() {
  await ensureNewsTables();
  const rows = await prisma.$queryRaw<{ n: number | bigint }[]>`
    SELECT COUNT(*) AS n FROM NewsItem WHERE hidden = 0 AND status = 'held'
  `;
  return Number(rows[0]?.n ?? 0);
}

/** Puts one headline on the wire. Only reaches rows left over from the gate. */
export async function releaseNewsItem(id: string) {
  await ensureNewsTables();
  const done = await prisma.$executeRaw`
    UPDATE NewsItem SET status = 'live' WHERE id = ${id} AND status = 'held'
  `;
  if (!done) throw new Error("That headline is not waiting.");
}

/**
 * Clears the backlog the gate built up. These came from the same approved
 * sources as everything published automatically, so holding them back was an
 * accident of the old behaviour rather than a decision about any one headline.
 */
export async function releaseAllHeld() {
  await ensureNewsTables();
  const done = await prisma.$executeRaw`
    UPDATE NewsItem SET status = 'live' WHERE status = 'held' AND hidden = 0
  `;
  return Number(done);
}

/** Removal is one step and immediate, whether it is live or still waiting. */
export async function hideNewsItem(id: string) {
  await ensureNewsTables();
  await prisma.$executeRaw`UPDATE NewsItem SET hidden = 1 WHERE id = ${id}`;
}

/**
 * Signup offers that passed the first spam check. They stay in the table so
 * a pull can be undone, but they leave the public wire and the Wing. The
 * same function that refuses them on the way in decides which rows to pull.
 */
export async function retireSpamNews() {
  await ensureNewsTables();
  const rows = await prisma.$queryRaw<
    { id: string; title: string; summary: string; url: string }[]
  >`
    SELECT id, title, summary, url FROM NewsItem
     WHERE hidden = 0 AND tag IN ('sport', 'casino', 'betting')
  `;
  const drop = rows.filter((row) => isBettingSpam(row.title, row.summary));
  for (const row of drop) {
    await prisma.$executeRaw`UPDATE NewsItem SET hidden = 1 WHERE id = ${row.id}`;
    try {
      await prisma.$executeRaw`
        DELETE FROM NetworkPost WHERE id = ${`wire-${row.id}`} OR link = ${row.url}
      `;
    } catch {
      /* the social tables may not exist yet on a fresh database */
    }
  }
  if (drop.length) {
    try {
      await prisma.$executeRawUnsafe(
        "DELETE FROM NetworkLike WHERE postId NOT IN (SELECT id FROM NetworkPost)",
      );
      await prisma.$executeRawUnsafe(
        "DELETE FROM NetworkComment WHERE postId NOT IN (SELECT id FROM NetworkPost)",
      );
    } catch {
      /* same */
    }
  }
  return drop.length;
}

/**
 * The first scrapers gathered football scores, Bitcoin prices and operator
 * trade press. Those rows stay in the table so a pull can be undone, but they
 * leave the public wire and the Wing. Names are literals the house chose —
 * not a user-supplied list.
 */
export async function retireOffTopicNews() {
  await prisma.$executeRaw`
    UPDATE NewsItem SET hidden = 1
     WHERE hidden = 0 AND (
       tag = 'crypto'
       OR source IN (
         'BBC Sport', 'Sky Sports', 'Guardian Sport',
         'Cointelegraph', 'Decrypt', 'CoinDesk', 'CoinJournal', 'Bitcoin Magazine',
         'iGaming Business', 'SBC Americas', 'Next.io', 'EGR Global'
       )
     )
  `;
  await prisma.$executeRaw`
    UPDATE NewsItem SET tag = 'sport'
     WHERE tag = 'betting' AND source IN ('Legal Sports Report', 'SBC News')
  `;
  await prisma.$executeRaw`
    UPDATE NewsItem SET tag = 'casino'
     WHERE tag = 'betting' AND source IN ('CasinoBeats')
  `;
  try {
    await prisma.$executeRaw`
      DELETE FROM NetworkPost
       WHERE link <> '' AND source IN (
         'BBC Sport', 'Sky Sports', 'Guardian Sport',
         'Cointelegraph', 'Decrypt', 'CoinDesk', 'CoinJournal', 'Bitcoin Magazine',
         'iGaming Business', 'SBC Americas', 'Next.io', 'EGR Global'
       )
    `;
    await prisma.$executeRawUnsafe(
      "DELETE FROM NetworkLike WHERE postId NOT IN (SELECT id FROM NetworkPost)",
    );
    await prisma.$executeRawUnsafe(
      "DELETE FROM NetworkComment WHERE postId NOT IN (SELECT id FROM NetworkPost)",
    );
  } catch {
    /* the social tables may not exist yet on a fresh database */
  }
}

let timer: NodeJS.Timeout | null = null;

export function startNewsWatcher() {
  if (timer) return;
  const run = () => {
    void fetchNewsOnce().catch(() => undefined);
  };
  // A short delay so a restart is not competing with the rest of boot.
  setTimeout(run, 20_000);
  timer = setInterval(run, POLL_MS);
}
