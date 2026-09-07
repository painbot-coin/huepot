import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const base = appUrl().replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // A player's vault, wing and the staff desk are nobody else's business,
        // and the API is not content.
        disallow: [
          "/api/",
          "/staff",
          "/staff/",
          "/account",
          "/invest",
          "/withdraw",
          "/notifications",
          "/network",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
