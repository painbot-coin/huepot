"use client";

import { useEffect, useState } from "react";
import { MIN_DEPOSIT } from "@/lib/config";
import { formatUsdt } from "@/lib/money";
import type { GameState, PublicWallet } from "@/lib/types";

type ChainStatus = {
  watching: boolean;
  networkId: string;
  name: string;
  standard: string;
  asset: string;
  confirms: number;
  lastBlock: number;
  explorer: string;
  lastError: string | null;
};

type PendingDeposit = {
  txHash: string;
  amount: number;
  confirmations: number;
  needed: number;
  blockNumber: number;
};

function txHashFromNote(note: string) {
  const match = note.match(/0x[a-fA-F0-9]{64}/);
  return match?.[0] ?? "";
}

export function InvestClient() {
  const [state, setState] = useState<GameState | null>(null);
  const [amount, setAmount] = useState(String(MIN_DEPOSIT));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [demoMoney, setDemoMoney] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [chain, setChain] = useState<ChainStatus | null>(null);
  const [pending, setPending] = useState<PendingDeposit[]>([]);

  async function load() {
    const response = await fetch("/api/state");
    const data = (await response.json()) as GameState;
    setState(data);
    if (!data.user) {
      window.location.href = "/signin";
    }
  }

  async function loadPending() {
    try {
      const response = await fetch("/api/deposit");
      const data = (await response.json()) as { pending?: PendingDeposit[] };
      if (response.ok && Array.isArray(data.pending)) setPending(data.pending);
    } catch {
      /* keep last */
    }
  }

  useEffect(() => {
    void load();
    void loadPending();
    void fetch("/api/auth/providers")
      .then(
        (response) =>
          response.json() as Promise<{ demoMoney?: boolean; chain?: ChainStatus }>,
      )
      .then((data) => {
        setDemoMoney(Boolean(data.demoMoney));
        if (data.chain) setChain(data.chain);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const poll = window.setInterval(() => {
      void load();
      void loadPending();
      void fetch("/api/chain/status")
        .then((response) => response.json() as Promise<ChainStatus>)
        .then((data) => setChain(data))
        .catch(() => undefined);
    }, 8_000);
    return () => window.clearInterval(poll);
  }, []);

  const liveWallet: PublicWallet | undefined = state?.user?.wallets.find(
    (item) => item.live,
  );
  const otherWallets = state?.user?.wallets.filter((item) => !item.live) ?? [];
  const confirms = chain?.confirms ?? 12;

  async function copyAddress() {
    if (!liveWallet) return;
    await navigator.clipboard.writeText(liveWallet.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function credit() {
    if (!liveWallet) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), networkId: liveWallet.id }),
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
      <h1 className="font-display text-4xl text-white">Add USDT</h1>
      <p className="mt-2 text-zinc-400">
        Send at least {MIN_DEPOSIT} USDT on BNB Chain (BEP-20) to your live
        address. Credit lands after {confirms} confirms. Any other chain is gone
        — Huepot does not watch it.
      </p>

      <p className="mt-6 font-display text-3xl text-white">
        {formatUsdt(state.user.balance)}{" "}
        <span className="text-base text-zinc-500">USDT</span>
      </p>
      {chain ? (
        <p className="mt-2 text-xs text-zinc-500">
          {chain.watching
            ? `Watching ${chain.name} · block ${chain.lastBlock || "—"}`
            : "Chain watch is off. Set BSC_RPC_URL or CHAIN_WATCH=1 to credit automatically."}
          {chain.lastError ? ` · ${chain.lastError}` : ""}
        </p>
      ) : null}

      {liveWallet ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Live deposit · {liveWallet.name} · {liveWallet.standard} {liveWallet.asset}
          </p>
          <button
            className="mt-2 w-full break-all rounded-2xl bg-black/40 px-4 py-3 text-left font-mono text-sm text-zinc-200"
            onClick={() => void copyAddress()}
            type="button"
          >
            {liveWallet.address}
          </button>
          <p className="mt-2 text-xs text-zinc-500">
            {copied
              ? "Copied."
              : `Send BEP-20 USDT only. Minimum ${MIN_DEPOSIT} USDT. Wrong network is not refunded.`}
          </p>
          {demoMoney ? (
            <>
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
                {busy ? "Crediting…" : `Demo credit ${amount || "0"} USDT`}
              </button>
            </>
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </section>
      ) : (
        <p className="mt-8 text-sm text-zinc-400">No live BNB Chain address yet. Sign in again.</p>
      )}

      {pending.length > 0 ? (
        <section className="mt-8">
          <p className="lobby-label">Waiting on chain</p>
          <ul className="mt-3 space-y-2">
            {pending.map((item) => (
              <li
                className="flex justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-zinc-300"
                key={item.txHash}
              >
                <span>
                  {formatUsdt(item.amount)} USDT · {item.confirmations}/{item.needed}{" "}
                  confirms
                  {chain?.explorer ? (
                    <>
                      {" · "}
                      <a
                        className="underline decoration-white/20 underline-offset-4"
                        href={`${chain.explorer}/tx/${item.txHash}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        BscScan
                      </a>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {otherWallets.length > 0 ? (
        <section className="mt-8">
          <button
            className="text-xs uppercase tracking-[0.18em] text-zinc-500 underline decoration-white/15 underline-offset-4"
            onClick={() => setShowOther((open) => !open)}
            type="button"
          >
            {showOther ? "Hide" : "More networks (not live)"}
          </button>
          {showOther ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {otherWallets.map((item) => (
                <div className="wallet-card" key={item.id}>
                  <p className="text-[11px] uppercase tracking-widest text-zinc-500">
                    {item.standard} · not watched
                  </p>
                  <p className="mt-1 text-lg text-white">{item.name}</p>
                  <p className="mt-2 break-all font-mono text-xs text-zinc-400">
                    {item.address}
                  </p>
                  <p className="mt-2 text-xs text-red-200/80">
                    Do not send here. Only BNB Chain USDT is credited.
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <ul className="mt-8 space-y-2">
        {deposits.length === 0 ? (
          <li className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-500">
            No credited deposits yet. After {confirms} confirms, they show here.
          </li>
        ) : (
          deposits.map((tx) => {
            const hash = txHashFromNote(tx.note);
            return (
              <li
                className="flex justify-between gap-3 rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400"
                key={tx.id}
              >
                <span>
                  {hash && chain?.explorer ? (
                    <a
                      className="underline decoration-white/20 underline-offset-4"
                      href={`${chain.explorer}/tx/${hash}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {tx.note}
                    </a>
                  ) : (
                    tx.note
                  )}
                </span>
                <span className="text-zinc-200">+{formatUsdt(tx.amount)}</span>
              </li>
            );
          })
        )}
      </ul>
    </main>
  );
}
