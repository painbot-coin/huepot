"use client";

import { useState } from "react";
import { formatUsdt } from "@/lib/money";
import type { Withdrawal } from "@/lib/types";

export function StaffPayoutsClient() {
  const [secret, setSecret] = useState("");
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [canSend, setCanSend] = useState(false);
  const [treasury, setTreasury] = useState<{
    address: string;
    usdt: number;
    bnb: number;
    ready: boolean;
  } | null>(null);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/staff/payouts", {
        headers: { "x-admin-secret": secret },
      });
      const data = (await response.json()) as {
        withdrawals?: Withdrawal[];
        error?: string;
        canSend?: boolean;
        treasury?: { address: string; usdt: number; bnb: number; ready: boolean };
      };
      if (!response.ok) throw new Error(data.error || "Could not load payouts");
      setRows(data.withdrawals ?? []);
      setCanSend(Boolean(data.canSend));
      if (data.treasury) setTreasury(data.treasury);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payouts");
    } finally {
      setBusy(false);
    }
  }

  async function act(id: string, action: "paid" | "rejected" | "send") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/staff/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({ id, action }),
      });
      const data = (await response.json()) as {
        withdrawals?: Withdrawal[];
        error?: string;
        canSend?: boolean;
      };
      if (!response.ok) throw new Error(data.error || "Could not update");
      setRows(data.withdrawals ?? []);
      if (typeof data.canSend === "boolean") setCanSend(data.canSend);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl text-white">Staff payouts</h1>
      <p className="mt-2 text-zinc-400">
        Cash-outs send themselves. Send retries a queued payout. Paid marks a
        send you already made. Reject puts the USDT back in the player bank.
      </p>

      <div className="mt-6 flex gap-3">
        <input
          className="field"
          onChange={(event) => setSecret(event.target.value)}
          placeholder="Staff secret"
          type="password"
          value={secret}
        />
        <button
          className="chip-btn justify-center whitespace-nowrap"
          disabled={busy || !secret}
          onClick={() => void load()}
          type="button"
        >
          {busy ? "Loading…" : "Open queue"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {treasury?.address ? (
        <p className="mt-4 break-all text-sm text-zinc-300">
          Send wallet {treasury.address} · {formatUsdt(treasury.usdt)} USDT · {treasury.bnb.toFixed(4)} BNB
          {treasury.ready ? " · funded" : " · empty until you send BEP-20 USDT and BNB"}
        </p>
      ) : null}
      <ul className="mt-8 space-y-2">
        {rows.map((row) => (
          <li
            className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400"
            key={row.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-zinc-200">
                  @{row.username ?? "player"} · {formatUsdt(row.amount)} USDT
                </p>
                <p className="mt-1 break-all font-mono text-xs">{row.address}</p>
                <p className="mt-1 text-xs uppercase tracking-widest">{row.status}</p>
                {row.txHash ? (
                  <a
                    className="mt-1 inline-block break-all font-mono text-xs text-amber-200/80"
                    href={`https://bscscan.com/tx/${row.txHash}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {row.txHash.slice(0, 10)}…{row.txHash.slice(-6)}
                  </a>
                ) : null}
              </div>
              {row.status === "queued" || row.status === "sending" ? (
                <div className="flex gap-2">
                  {canSend && row.status === "queued" ? (
                    <button
                      className="chip-btn"
                      disabled={busy}
                      onClick={() => void act(row.id, "send")}
                      type="button"
                    >
                      Send
                    </button>
                  ) : null}
                  <button
                    className="chip-btn"
                    disabled={busy}
                    onClick={() => void act(row.id, "paid")}
                    type="button"
                  >
                    Paid
                  </button>
                  {row.status === "queued" ? (
                    <button
                      className="chip-btn chip-btn-ghost"
                      disabled={busy}
                      onClick={() => void act(row.id, "rejected")}
                      type="button"
                    >
                      Reject
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
