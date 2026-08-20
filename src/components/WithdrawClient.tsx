"use client";

import { useEffect, useState } from "react";
import { MIN_WITHDRAW } from "@/lib/config";
import { formatUsdt } from "@/lib/money";
import type { GameState } from "@/lib/types";

export function WithdrawClient() {
  const [state, setState] = useState<GameState | null>(null);
  const [networkId, setNetworkId] = useState("");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/state");
    const data = (await response.json()) as GameState;
    setState(data);
    if (!data.user) {
      window.location.href = "/signin";
      return;
    }
    setNetworkId((current) => current || data.user!.wallets[0]?.id || "");
    setAddress(data.user.withdrawAddress || "");
  }

  useEffect(() => {
    void load();
  }, []);

  const wallet = state?.user?.wallets.find((item) => item.id === networkId);

  async function send() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          address,
          networkId,
        }),
      });
      const data = (await response.json()) as GameState & { error?: string };
      if (!response.ok) throw new Error(data.error || "Withdraw failed");
      setState(data);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  if (!state?.user) {
    return (
      <p className="px-4 py-16 text-center text-zinc-400">Loading account…</p>
    );
  }

  const withdraws = state.user.txs.filter((tx) => tx.type === "withdraw");

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="font-display text-4xl text-white">Withdraw</h1>
      <p className="mt-2 text-zinc-400">
        Cash out play USDT to a wallet you own on the network you pick. Demo
        mode deducts the balance immediately.
      </p>

      <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Available
        </p>
        <p className="font-display text-3xl text-white">
          {formatUsdt(state.user.balance)} USDT
        </p>

        <label className="mt-6 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Network
        </label>
        <select
          className="field"
          onChange={(event) => setNetworkId(event.target.value)}
          value={networkId}
        >
          {state.user.wallets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.standard} {item.asset}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Destination address
        </label>
        <input
          className="field font-mono"
          onChange={(event) => setAddress(event.target.value)}
          placeholder={
            wallet?.family === "tron"
              ? "T…"
              : wallet?.family === "sol"
                ? "Solana address"
                : wallet?.family === "btc"
                  ? "bc1… or 1…"
                  : "0x…"
          }
          value={address}
        />

        <label className="mt-4 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Amount
        </label>
        <input
          className="field"
          min={MIN_WITHDRAW}
          onChange={(event) => setAmount(event.target.value)}
          placeholder={String(MIN_WITHDRAW)}
          step="1"
          type="number"
          value={amount}
        />

        <button
          className="chip-btn mt-4 w-full justify-center"
          disabled={busy}
          onClick={() => void send()}
          type="button"
        >
          {busy ? "Sending…" : "Withdraw (demo)"}
        </button>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </section>

      <ul className="mt-8 space-y-2">
        {withdraws.map((tx) => (
          <li
            className="flex justify-between gap-3 rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400"
            key={tx.id}
          >
            <span>{tx.note}</span>
            <span className="text-zinc-200">-{formatUsdt(tx.amount)}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
