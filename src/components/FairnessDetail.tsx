"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { colorById } from "@/lib/colors";
import {
  settledDollars,
  settledPreimage,
  settledTakeAmount,
  verifySettledRound,
  type PublicSettledRound,
} from "@/lib/fairness";
import { formatUsdt } from "@/lib/money";

export function FairnessDetail({ id }: { id: string }) {
  const [row, setRow] = useState<PublicSettledRound | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    void fetch(`/api/fairness/${id}`)
      .then(async (response) => {
        const data = (await response.json()) as { round?: PublicSettledRound };
        if (!response.ok || !data.round) {
          setMissing(true);
          return;
        }
        setRow(data.round);
      })
      .catch(() => setMissing(true));
  }, [id]);

  const check = useMemo(() => (row ? verifySettledRound(row) : null), [row]);

  if (missing) {
    return (
      <main className="app-page is-wide">
        <p className="hall-kicker">The ledger</p>
        <p className="app-lead">That round is not in the ledger.</p>
        <Link className="nav-link mt-4 inline-block" href="/fairness">
          All pages
        </Link>
      </main>
    );
  }

  if (!row || !check) {
    return (
      <p className="px-4 py-16 text-center text-zinc-400">Opening the ledger…</p>
    );
  }

  return (
    <main className="app-page is-wide">
      <p className="hall-kicker">The ledger</p>
      <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        {row.roomName} · round #{row.number}
      </p>
      <h1 className="font-display mt-2 text-4xl text-white">
        {check.ok ? "Checks out" : "Does not check"}
      </h1>
      <p className="app-lead">
        Verified in your browser: commit, settle digest, and payout math. Every
        value used is printed below, so you can recompute it yourself.
      </p>

      {row.kind === "take" && row.winners.length ? (
        <p className="ledger-took">
          {row.winners.map((id) => colorById(id).name).join(" & ")} took{" "}
          {formatUsdt(settledTakeAmount(row))} USDT
        </p>
      ) : null}

      <ul className="mt-6 space-y-2 text-sm text-zinc-300">
        <li>Commit matches seed · {check.commitOk ? "yes" : "no"}</li>
        <li>Settle digest matches · {check.hashOk ? "yes" : "no"}</li>
        <li>Most-clicks math matches · {check.mathOk ? "yes" : "no"}</li>
      </ul>

      <section className="app-card space-y-3 text-sm text-zinc-400">
        <p>
          Kind · {row.kind}
          {row.winners.length
            ? ` · ${row.winners.map((id) => colorById(id).name).join(" & ")}`
            : ""}
        </p>
        <p>Click price · {formatUsdt(settledDollars(row, row.clickPrice))} USDT</p>
        <p>Losing pot · {formatUsdt(settledDollars(row, row.losingPot))} USDT</p>
        {row.rake ? (
          <p>House take · {formatUsdt(settledDollars(row, row.rake))} USDT</p>
        ) : null}
        <p>
          Floor per winning click ·{" "}
          {formatUsdt(settledDollars(row, row.payoutPerWinningClick))} USDT
        </p>
        <p>Paid seats · {row.paidCount}</p>
        {row.kind === "take" ? (
          <p className="text-xs text-zinc-500">
            The digest commits to the floor above. Cents left over after the
            even split go to winning seats, so the whole pot is paid out — the
            floor times the winning clicks can land a few cents under the total.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-2">
          {row.buttonIds.map((id) => (
            <span className="ledger-chip" key={id}>
              {colorById(id).name} {row.totals[id] ?? 0}
            </span>
          ))}
        </div>
      </section>

      <section className="app-card">
        <p className="hall-kicker">Check it yourself</p>
        <p className="mt-1 text-sm text-zinc-400">
          sha256 of the seed is the commit. sha256 of the settle line is the
          digest. Both are printed in full.
        </p>

        <p className="ledger-label">Server seed</p>
        <p className="ledger-hash">{row.serverSeed}</p>

        <p className="ledger-label">Commit · sha256 of the seed</p>
        <p className="ledger-hash">{row.seedCommit}</p>

        <p className="ledger-label">Settle line</p>
        <p className="ledger-hash">{settledPreimage(row)}</p>

        <p className="ledger-label">Digest · sha256 of the settle line</p>
        <p className="ledger-hash">{row.fairHash}</p>
      </section>

      <Link className="nav-link mt-6 inline-block" href={`/rooms/${row.roomSlug}`}>
        Back to {row.roomName}
      </Link>
    </main>
  );
}
