"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { settledDollars, settledSummary, type PublicSettledRound } from "@/lib/fairness";
import { formatUsdt } from "@/lib/money";

export function FairnessClient({ slug }: { slug?: string }) {
  const [rounds, setRounds] = useState<PublicSettledRound[]>([]);

  useEffect(() => {
    const query = slug ? `?slug=${encodeURIComponent(slug)}` : "";
    void fetch(`/api/fairness${query}`)
      .then((response) => response.json() as Promise<{ rounds?: PublicSettledRound[] }>)
      .then((data) => setRounds(data.rounds ?? []))
      .catch(() => undefined);
  }, [slug]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl text-white">Fairness</h1>
      <p className="mt-2 text-zinc-400">
        The color with the most clicks still takes the pot. The seed does not pick
        a winner. It is hashed when the round opens and revealed when it settles,
        so the sheet cannot be rewritten after the clock.
      </p>
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-zinc-400">
        <li>When a round goes live, Huepot publishes sha256(server seed).</li>
        <li>Clicks land as usual. Most clicks win. A full tie refunds.</li>
        <li>
          At settle, the seed is revealed. Anyone can check the commit, the
          digest, and the payout math.
        </li>
      </ol>

      <ul className="mt-8 space-y-2">
        {rounds.map((row) => (
          <li key={row.id}>
            <Link
              className="flex justify-between gap-3 rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400"
              href={`/fairness/${row.id}`}
            >
              <span>
                {row.roomName} · round #{row.number} · {settledSummary(row)}
              </span>
              <span className="text-zinc-200">{formatUsdt(settledDollars(row, row.losingPot))} pot</span>
            </Link>
          </li>
        ))}
        {rounds.length === 0 ? (
          <li className="text-sm text-zinc-500">No settled rounds on the sheet yet.</li>
        ) : null}
      </ul>
    </main>
  );
}
