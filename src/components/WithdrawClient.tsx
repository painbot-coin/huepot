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
  const [live, setLive] = useState(false);

  async function load() {
    const response = await fetch("/api/state");
    const data = (await response.json()) as GameState;
    setState(data);
    if (!data.user) {
      window.location.href = "/signin";
      return;
    }
    const liveId = data.user.wallets.find((item) => item.live)?.id;
    setNetworkId((current) => current || liveId || data.user!.wallets[0]?.id || "");
    setAddress(data.user.withdrawAddress || "");
  }

  useEffect(() => {
    void load();
    void fetch("/api/auth/providers")
      .then((response) => response.json() as Promise<{ liveWithdrawals?: boolean }>)
      .then((data) => setLive(Boolean(data.liveWithdrawals)))
      .catch(() => undefined);
  }, []);

  const wallets = live
    ? state?.user?.wallets.filter((item) => item.live) ?? []
    : state?.user?.wallets ?? [];
  const wallet = wallets.find((item) => item.id === networkId) ?? wallets[0];

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
          networkId: wallet?.id ?? networkId,
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

  const withdraws = state.user.txs.filter((tx) => tx.type === "withdraw" || tx.type === "refund");

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="font-display text-4xl text-white">Withdraw</h1>
      <p className="mt-2 text-zinc-400">
          {live
          ? "Cash out USDT on BNB Chain. Staff send it from the house wallet; you get a notice when it leaves."
          : "Live cash-out is BNB Chain USDT only."}
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
          value={wallet?.id ?? networkId}
        >
          {wallets.map((item) => (
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
          {busy ? "Sending…" : "Queue withdraw"}
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
            <span className="text-zinc-200">
              {tx.type === "refund" ? "+" : "-"}
              {formatUsdt(tx.amount)}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
