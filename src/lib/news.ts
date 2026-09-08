import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Betting and crypto headlines, fetched on a timer and put on the wire.
 * Deliberately narrow in what it takes: a headline, a link, the source name
 * and the feed's own image. Never an article body - reposting someone else's
 * writing is republishing it, and a link is not.
 *
 * Publishing is automatic, which is what was asked for. It was briefly gated
 * behind a staff click, on the reasoning that an unwatched feed would
 * eventually offer a fixed-match tip or a scam promotion. That gate published
 * nothing for a day: 108 headlines queued and the release button was pressed
 * zero times. The approval that keeps the house name safe is the source list
 * below - eight mainstream editorial outlets - not a button nobody is
 * standing next to. Staff can still pull anything off the wire in one click.
 *
 * Writes straight to its own table and never touches the in-memory store, so a
 * fetch cannot sit in the lane that settles rounds.
 */

export type NewsSource = { name: string; url: string; tag: "crypto" | "sport" };

/** Every feed here answered from the server before being added. */
export const NEWS_SOURCES: NewsSource[] = [
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss", tag: "crypto" },
  { name: "Decrypt", url: "https://decrypt.co/feed", tag: "crypto" },
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", tag: "crypto" },
  { name: "CoinJournal", url: "https://coinjournal.net/feed/", tag: "crypto" },
  { name: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/feed", tag: "crypto" },
  { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", tag: "sport" },
  { name: "Sky Sports", url: "https://www.skysports.com/rss/12040", tag: "sport" },
  { name: "Guardian Sport", url: "https://www.theguardian.com/sport/rss", tag: "sport" },
];

/** Per source, per run. Eight feeds of thirty would bury the hall. */
const PER_SOURCE = 5;
const POLL_MS = 15 * 60 * 1000;
const AGENT = "HuepotNewsBot/1.0 (+https://huepot.net)";

export type NewsItem = {
  id: string;
  source: string;
  tag: string;
  title: string;
  url: string;
  image: string;
  publishedAt: number;
};

let ready = false;

export async function ensureNewsTables() {
  if (ready) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS NewsItem (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      tag TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      publishedAt BIGINT NOT NULL,
      fetchedAt BIGINT NOT NULL,
      hidden INTEGER NOT NULL DEFAULT 0
    )
  `);
  try {
    // Defaults to 'live' so the rows already on the wire stay on it. New rows
    // are inserted as 'held' explicitly, which is what makes this a gate.
    await prisma.$executeRawUnsafe(
      "ALTER TABLE NewsItem ADD COLUMN status TEXT NOT NULL DEFAULT 'live'",
    );
  } catch {
    /* column already exists */
  }
  ready = true;
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
  for (const block of blocks) {
    const title = tagText(block, "title");
    // The guid is usually the clean article URL; the link often carries a
    // campaign string. Atom keeps the URL in a link href instead.
    const guid = tagText(block, "guid");
    const link = tagText(block, "link") || attr(block, "link", "href");
    const url = cleanUrl(/^https?:\/\//i.test(guid) ? guid : link);
    if (!title || !url) continue;
    const when = tagText(block, "pubDate") || tagText(block, "published") || tagText(block, "updated");
    const at = when ? Date.parse(when) : Number.NaN;
    out.push({
      id: createHash("sha256").update(url).digest("hex").slice(0, 32),
      source: source.name,
      tag: source.tag,
      title: title.slice(0, 200),
      url,
      image: imageOf(block),
      publishedAt: Number.isFinite(at) ? at : Date.now(),
    });
    if (out.length >= PER_SOURCE) break;
  }
  return out;
}

async function saveItems(items: NewsItem[]) {
  await ensureNewsTables();
  let added = 0;
  const now = Date.now();
  for (const item of items) {
    // Keyed by the hash of the URL, so the same article twice is one row and
    // the dedupe needs no extra query.
    const done = await prisma.$executeRaw`
      INSERT OR IGNORE INTO NewsItem
        (id, source, tag, title, url, image, publishedAt, fetchedAt, hidden, status)
      VALUES (${item.id}, ${item.source}, ${item.tag}, ${item.title}, ${item.url},
              ${item.image}, ${item.publishedAt}, ${now}, 0, 'live')
    `;
    added += done;
  }
  return added;
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
  return reports;
}

type Row = Omit<NewsItem, "publishedAt"> & { publishedAt: string };

/** What the hall sees: released, and not pulled since. */
export async function listNews(limit = 24) {
  await ensureNewsTables();
  const take = Math.max(1, Math.min(60, Math.floor(limit)));
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT id, source, tag, title, url, image, CAST(publishedAt AS TEXT) AS publishedAt
      FROM NewsItem WHERE hidden = 0 AND status = 'live'
     ORDER BY publishedAt DESC LIMIT ${take}
  `;
  return rows.map((row) => ({ ...row, publishedAt: Number(row.publishedAt) }));
}

/** What is waiting on a decision. Oldest first, so nothing sits forgotten. */
export async function listHeldNews(limit = 60) {
  await ensureNewsTables();
  const take = Math.max(1, Math.min(120, Math.floor(limit)));
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT id, source, tag, title, url, image, CAST(publishedAt AS TEXT) AS publishedAt
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
