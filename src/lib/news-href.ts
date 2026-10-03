/**
 * Where a headline lives on this house. Safe for the browser: no feed parse,
 * no database. The story page is `/news/[id]`. Talk is the network card.
 */

export function talkHref(talkId: string) {
  const id = talkId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80);
  if (!id.startsWith("wire-") || id.length < 6) return "";
  return `/network?post=${encodeURIComponent(id)}`;
}

/** The hash we store. Anything else is not a story on this house. */
export function parseNewsId(raw: string) {
  const id = (raw ?? "").trim().toLowerCase();
  return /^[a-f0-9]{32}$/.test(id) ? id : "";
}

/** Desks on the news filter row. The rest stay findable from a story. */
export const NEWS_DESK_CHIPS = 10;

export function newsDeskChips<T>(rows: T[], selected?: (row: T) => boolean) {
  const top = rows.slice(0, NEWS_DESK_CHIPS);
  if (!selected) return top;
  const extra = rows.find((row, index) => index >= NEWS_DESK_CHIPS && selected(row));
  return extra ? [extra, ...top.slice(0, NEWS_DESK_CHIPS - 1)] : top;
}

export function newsHref(id: string) {
  const clean = parseNewsId(id);
  return clean ? `/news/${clean}` : "";
}

export function isNewsHref(href: string) {
  return /^\/news\/[a-f0-9]{32}$/i.test((href ?? "").trim());
}

/** A feed card may still hold the old outbound URL. The post id is enough. */
export function newsHrefFromPost(postId: string, link = "") {
  if (isNewsHref(link)) return link.trim();
  const id = (postId ?? "").startsWith("wire-") ? parseNewsId(postId.slice(5)) : "";
  return id ? newsHref(id) : "";
}
