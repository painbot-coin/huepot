import type { Metadata } from "next";
import Link from "next/link";
import { listNews } from "@/lib/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The wire",
  description:
    "Betting and crypto headlines, gathered by the house. Every line links out to whoever wrote it.",
};

function ago(at: number) {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function NewsPage() {
  const items = await listNews(30);

  return (
    <main className="prose-page">
      <p className="hall-kicker">The wire</p>
      <h1 className="font-display text-4xl text-white">What the tape says</h1>
      <p>
        Headlines gathered from the feeds below, newest first. Every line is a
        link out to whoever wrote it — the house keeps the headline and nothing
        else.
      </p>

      {items.length ? (
        <ul className="wire-list">
          {items.map((item) => (
            <li key={item.id}>
              <a href={item.url} rel="noopener noreferrer nofollow" target="_blank">
                {item.title}
              </a>
              <span className="wire-meta">
                {item.source} · {ago(item.publishedAt)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-zinc-500">
          The wire is quiet. Headlines land within a quarter of an hour of the
          house starting up.
        </p>
      )}

      <p className="mt-8">
        <Link className="chip-btn" href="/rooms/classic">
          Sit Classic
        </Link>
      </p>
    </main>
  );
}
