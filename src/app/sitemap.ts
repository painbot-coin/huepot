import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/config";
import { listSettledRounds } from "@/lib/fairness-db";
import { listHouseJobs } from "@/lib/house-jobs";
import { listNews, newsHref } from "@/lib/news";
import { BASIC_ROOMS } from "@/lib/rooms";

export const runtime = "nodejs";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl().replace(/\/$/, "");
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/wait`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/wait/store`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/board`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/network`, lastModified: now, changeFrequency: "hourly", priority: 0.6 },
    { url: `${base}/news`, lastModified: now, changeFrequency: "hourly", priority: 0.6 },
    { url: `${base}/jobs`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/atrium`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/companies`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/contracts`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    ...listHouseJobs().map((job) => ({
      url: `${base}/jobs/${job.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.45,
    })),
    { url: `${base}/fairness`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/signin`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ...BASIC_ROOMS.map((room) => ({
      url: `${base}/rooms/${room.slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    })),
  ];

  // A production build writes the door list and does not wait on the books.
  // Takes and headlines fill in on the next pass. Guest tables stay out:
  // they fall when their live time ends.
  if (process.env.HUEPOT_BUILD === "1") return pages;

  try {
    const takes = await listSettledRounds(undefined, 80, "take");
    for (const row of takes) {
      const at = new Date(row.settledAt);
      pages.push({
        url: `${base}/take/${row.id}`,
        lastModified: at,
        changeFrequency: "never",
        priority: 0.6,
      });
      pages.push({
        url: `${base}/fairness/${row.id}`,
        lastModified: at,
        changeFrequency: "never",
        priority: 0.4,
      });
    }
  } catch {
    /* a sitemap without takes still beats no sitemap */
  }

  try {
    const headlines = await listNews({ limit: 40 });
    for (const row of headlines) {
      const href = newsHref(row.id);
      if (!href) continue;
      pages.push({
        url: `${base}${href}`,
        lastModified: new Date(row.publishedAt),
        changeFrequency: "daily",
        priority: 0.45,
      });
    }
  } catch {
    /* a sitemap without stories still beats no sitemap */
  }

  return pages;
}
