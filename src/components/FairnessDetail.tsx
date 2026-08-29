"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { colorById } from "@/lib/colors";
import {
  settledDollars,
  shortHash,
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
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <p className="text-zinc-400">That round is not on the sheet.</p>
        <Link className="nav-link mt-4 inline-block" href="/fairness">
          All rounds
        </Link>
      </main>
    );
  }

  if (!row || !check) {
    return (
      <p className="px-4 py-16 text-center text-zinc-400">Opening the sheet…</p>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        {row.roomName} · round #{row.number}
      </p>
      <h1 className="font-display mt-2 text-4xl text-white">
        {check.ok ? "Checks out" : "Does not check"}
      </h1>
      <p className="mt-2 text-zinc-400">
        Verified in your browser: commit, settle digest, and payout math.
      </p>

      <ul className="mt-6 space-y-2 text-sm text-zinc-300">
        <li>Commit matches seed · {check.commitOk ? "yes" : "no"}</li>
        <li>Settle digest matches · {check.hashOk ? "yes" : "no"}</li>
        <li>Most-clicks math matches · {check.mathOk ? "yes" : "no"}</li>
      </ul>

      <section className="mt-8 space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-400">
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
        <p>Paid seats · {row.paidCount}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          {row.buttonIds.map((id) => (
            <span className="rounded-full bg-black/30 px-3 py-1" key={id}>
              {colorById(id).name} {row.totals[id] ?? 0}
            </span>
          ))}
        </div>
        <p className="break-all font-mono text-xs">Commit {shortHash(row.seedCommit)}</p>
        <p className="break-all font-mono text-xs">Seed {row.serverSeed}</p>
        <p className="break-all font-mono text-xs">Digest {shortHash(row.fairHash)}</p>
      </section>

      <Link className="nav-link mt-6 inline-block" href={`/rooms/${row.roomSlug}`}>
        Back to {row.roomName}
      </Link>
    </main>
  );
}
