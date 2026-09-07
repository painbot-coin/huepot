"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  settledSummary,
  settledTakeAmount,
  type PublicSettledRound,
} from "@/lib/fairness";
import { formatUsdt } from "@/lib/money";

export function FairnessClient({ slug }: { slug?: string }) {
  const [rounds, setRounds] = useState<PublicSettledRound[]>([]);
  const [settled, setSettled] = useState(0);
  // The ledger must not claim nothing has settled before it has looked.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const query = slug ? `?slug=${encodeURIComponent(slug)}` : "";
    void fetch(`/api/fairness${query}`)
      .then(
        (response) =>
          response.json() as Promise<{
            rounds?: PublicSettledRound[];
            settled?: number;
          }>,
      )
      .then((data) => {
        setRounds(data.rounds ?? []);
        setSettled(data.settled ?? 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [slug]);

  return (
    <main className="app-page is-wide">
      <p className="hall-kicker">The ledger</p>
      <h1 className="font-display text-4xl text-white">Fairness</h1>
      <p className="app-lead">
        The color with the most clicks still takes the pot. The seed does not pick
        a winner. It is hashed when the round opens and revealed when it settles,
        so the sheet cannot be rewritten after the clock.
      </p>
      <ol className="app-steps">
        <li>
          <strong>The book opens</strong>
          Huepot publishes sha256 of the server seed.
        </li>
        <li>
          <strong>Clicks land</strong>
          Most clicks win. A full tie refunds.
        </li>
        <li>
          <strong>The page settles</strong>
          The seed is revealed so anyone can check the commit and the payout math.
        </li>
      </ol>

      <p className="ledger-count">
        {!loaded
          ? "Opening the book…"
          : settled > 0
            ? `${settled.toLocaleString()} rounds settled in this house. The takes are listed below — a round nobody clicked has no payout to check.`
            : "No rounds have settled yet."}
      </p>

      <ul className="ledger-list">
        {rounds.map((row) => (
          <li key={row.id}>
            <Link className="ledger-row" href={`/fairness/${row.id}`}>
              <span>
                {row.roomName} · round #{row.number} · {settledSummary(row)}
              </span>
              <span>{formatUsdt(settledTakeAmount(row))} USDT</span>
            </Link>
          </li>
        ))}
        {loaded && rounds.length === 0 ? (
          <li className="empty-note">
            No color has taken a pot yet.{" "}
            <Link className="underline" href="/rooms/classic">
              Sit Classic
            </Link>{" "}
            to open the first public line.
          </li>
        ) : null}
      </ul>
    </main>
  );
}
