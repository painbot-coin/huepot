"use client";

import { useEffect, useState } from "react";
import { MIN_DEPOSIT } from "@/lib/config";
import { formatUsdt } from "@/lib/money";
import type { GameState, PublicWallet } from "@/lib/types";

export function InvestClient() {
  const [state, setState] = useState<GameState | null>(null);
  const [networkId, setNetworkId] = useState("");
  const [amount, setAmount] = useState(String(MIN_DEPOSIT));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    const response = await fetch("/api/state");
    const data = (await response.json()) as GameState;
    setState(data);
    if (!data.user) {
      window.location.href = "/signin";
      return;
    }
    setNetworkId((current) => current || data.user!.wallets[0]?.id || "");
  }

  useEffect(() => {
    void load();
  }, []);

  const wallet: PublicWallet | undefined = state?.user?.wallets.find(
    (item) => item.id === networkId,
  );

  async function copyAddress() {
    if (!wallet) return;
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function credit() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), networkId }),
      });
      const data = (await response.json()) as GameState & { error?: string };
      if (!response.ok) throw new Error(data.error || "Deposit failed");
      setState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setBusy(false);
    }
  }

  if (!state?.user) {
    return (
      <p className="px-4 py-16 text-center text-zinc-400">Loading wallets…</p>
    );
  }

  const deposits = state.user.txs.filter((tx) => tx.type === "deposit");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl text-white">Invest</h1>
      <p className="mt-2 text-zinc-400">
        These deposit addresses were created for your account. Send USDT (or
        BTC) on the matching network, then confirm the amount. Demo mode
        credits instantly.
      </p>

      <p className="mt-6 font-display text-3xl text-white">
        {formatUsdt(state.user.balance)}{" "}
        <span className="text-base text-zinc-500">USDT</span>
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {state.user.wallets.map((item) => (
          <button
            className={`wallet-card ${item.id === networkId ? "is-active" : ""}`}
            key={item.id}
            onClick={() => setNetworkId(item.id)}
            type="button"
          >
            <p className="text-[11px] uppercase tracking-widest text-zinc-500">
              {item.standard}
            </p>
            <p className="mt-1 text-lg text-white">{item.name}</p>
            <p className="mt-2 break-all font-mono text-xs text-zinc-400">
              {item.address}
            </p>
          </button>
        ))}
      </div>

      {wallet ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            {wallet.name} · {wallet.standard} {wallet.asset}
          </p>
          <button
            className="mt-2 w-full break-all rounded-2xl bg-black/40 px-4 py-3 text-left font-mono text-sm text-zinc-200"
            onClick={() => void copyAddress()}
            type="button"
          >
            {wallet.address}
          </button>
          <p className="mt-2 text-xs text-zinc-500">
            {copied ? "Copied." : wallet.hint}
          </p>
          <label className="mt-6 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Amount in USDT
          </label>
          <input
            className="field"
            min={MIN_DEPOSIT}
            onChange={(event) => setAmount(event.target.value)}
            step="1"
            type="number"
            value={amount}
          />
          <button
            className="chip-btn mt-4 w-full justify-center"
            disabled={busy}
            onClick={() => void credit()}
            type="button"
          >
            {busy
              ? "Crediting…"
              : `I sent ${amount || "0"} USDT on ${wallet.standard}`}
          </button>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </section>
      ) : null}

      <ul className="mt-8 space-y-2">
        {deposits.map((tx) => (
          <li
            className="flex justify-between gap-3 rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400"
            key={tx.id}
          >
            <span>{tx.note}</span>
            <span className="text-zinc-200">+{formatUsdt(tx.amount)}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
