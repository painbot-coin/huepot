"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type WireCard = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: number;
  talkId?: string;
};

function talkPath(talkId: string) {
  const id = talkId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80);
  if (!id.startsWith("wire-") || id.length < 6) return "";
  return `/network?post=${encodeURIComponent(id)}`;
}

function ageLabel(at: number, now: number) {
  const delta = Math.max(0, now - at);
  const mins = Math.floor(delta / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * The tape, on the hall, under the lintel. A stranger who never opens Wire
 * still sees that the house is reading betting games. Hidden when the tape
 * is quiet, so the lobby does not announce emptiness twice.
 */
export function PublicWire() {
  const [items, setItems] = useState<WireCard[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch("/api/news");
        const data = (await response.json()) as { items?: WireCard[] };
        if (alive && Array.isArray(data.items)) setItems(data.items);
      } catch {
        /* keep last */
      }
    }
    void load();
    const poll = window.setInterval(() => void load(), 30_000);
    const tick = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      alive = false;
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, []);

  if (!items.length) return null;

  return (
    <section className="payout-strip take-strip wire-strip" aria-label="Betting-game headlines">
      <p className="lobby-label">
        The tape{" "}
        <Link className="wire-strip-more" href="/news">
          All of it
        </Link>
      </p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a href={item.url} rel="noopener noreferrer nofollow" target="_blank">
              <strong>{item.title}</strong>
              {item.source}
              <span>{ageLabel(item.publishedAt, now)}</span>
            </a>
            {talkPath(item.talkId ?? "") ? (
              <Link className="wire-strip-talk" href={talkPath(item.talkId ?? "")}>
                Talk
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
