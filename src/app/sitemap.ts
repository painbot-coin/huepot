import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/config";
import { listSettledRounds } from "@/lib/fairness-db";
import { BASIC_ROOMS } from "@/lib/rooms";

export const runtime = "nodejs";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl().replace(/\/$/, "");
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
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

  // Real takes are the only durable public content the house produces. Guest
  // tables are left out: they fall when their live time ends.
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

  return pages;
}
