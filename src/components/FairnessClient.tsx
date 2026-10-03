"use client";
import { HouseButton, PageHead } from "@/components/HouseUi";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HouseFloor } from "@/components/HouseFloor";
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
    <HouseFloor
      extra={[
        { href: "/fairness", label: "Fairness", match: true },
        { href: "/how-it-works", label: "How it works" },
        { href: "/board", label: "Leaderboard" },
      ]}
      kicker="Fairness"
      side={
        <div>
          <p className="lobby-label">The book</p>
          <p className="account-note">
            Seed is hashed when the round opens and revealed when it settles.
            Most clicks still take the pot.
          </p>
          <div className="li-profile-act">
            <HouseButton href="/rooms/classic">
              Play Classic
            </HouseButton>
            <HouseButton ghost href="/how-it-works">
              How it works
            </HouseButton>
          </div>
        </div>
      }
    >
    <main className="app-page is-wide is-in-floor">
      <PageHead
        lead="The color with the most clicks still takes the pot. The seed does not pick a winner. It is hashed when the round opens and revealed when it settles."
        title="Fairness"
      />
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
            ? `${settled.toLocaleString()} rounds with a bet have settled on Huepot. The wins are listed below. A round nobody clicked is not written down, because there is nothing in it to check.`
            : "No rounds with a bet have settled yet."}
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
              Play Classic
            </Link>{" "}
            to open the first public line.
          </li>
        ) : null}
      </ul>
    </main>
    </HouseFloor>
  );
}
