"use client";

import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import HouseLink from "@/components/HouseLink";
import { NewsCard, type NewsRow } from "@/components/NewsDesk";

/**
 * The tape, on the hall, under the lintel. A stranger who never opens News
 * still sees that the house is reading betting games. Hidden when the tape
 * is quiet, so the lobby does not announce emptiness twice.
 */
export function PublicWire() {
  const [items, setItems] = useState<NewsRow[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch("/api/news");
        const data = (await response.json()) as { items?: NewsRow[] };
        if (alive && Array.isArray(data.items)) setItems(data.items);
      } catch {
        /* keep last */
      }
    }
    void load();
    const poll = window.setInterval(() => void load(), 30_000);
    return () => {
      alive = false;
      window.clearInterval(poll);
    };
  }, []);

  if (!items.length) return null;

  return (
    <section className="payout-strip take-strip wire-strip news-strip" aria-label="Betting-game headlines">
      <Typography color="text.secondary" variant="overline">
        News{" "}
        <HouseLink href="/news">All of it</HouseLink>
      </Typography>
      <div className="news-list">
        {items.map((item) => (
          <NewsCard compact item={{ ...item, image: item.image || "", summary: item.summary || "" }} key={item.id} />
        ))}
      </div>
    </section>
  );
}
