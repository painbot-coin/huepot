import type { NetworkPost } from "@/lib/types";

function recommendScore(post: NetworkPost, viewerName: string) {
  const ageHours = Math.max(0, (Date.now() - post.createdAt) / 3_600_000);
  const recency = Math.max(0, 72 - ageHours);
  const other = viewerName && post.username.toLowerCase() === viewerName ? 0 : 6;
  const open = post.relation === "none" ? 3 : 0;
  return post.likes * 4 + post.comments.length * 3 + recency + other + open;
}

/** Rank the same cards. A guest has no name, so own-line demotion does not run. */
export function recommendPosts(
  posts: NetworkPost[],
  viewerName = "",
): NetworkPost[] {
  const name = viewerName.trim().toLowerCase();
  const ranked = [...posts].sort((a, b) => recommendScore(b, name) - recommendScore(a, name));
  const others = name
    ? ranked.filter((post) => post.username.toLowerCase() !== name)
    : ranked;
  return (others.length ? others : ranked).slice(0, 40);
}
