"use client";

import { useEffect, useRef, useState } from "react";
import { publishBank } from "@/lib/bank-sync";
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
  const [chain, setChain] = useState<ChainStatus | null>(null);
  const [pending, setPending] = useState<PendingDeposit[]>([]);
  const [landed, setLanded] = useState("");
  const seenDeposits = useRef(new Set<string>());

  async function load() {
    const response = await fetch("/api/state");
    const data = (await response.json()) as GameState;
    setState(data);
    if (typeof data.user?.balance === "number") publishBank(data.user.balance);
    if (!data.user) {
      window.location.href = "/signin";
      return;
    }
    const deposits = data.user.txs.filter((tx) => tx.type === "deposit");
    const fresh = deposits.filter((tx) => !seenDeposits.current.has(tx.id));
    if (seenDeposits.current.size > 0 && fresh.length) {
      const newest = fresh[0];
      setLanded(`Credited ${formatUsdt(newest.amount)} USDT. Sit a table or cash out.`);
    }
    for (const tx of deposits) seenDeposits.current.add(tx.id);
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

  const waiting = pending.length > 0;

  useEffect(() => {
    const poll = window.setInterval(() => {
      void load();
      void loadPending();
      void fetch("/api/chain/status")
        .then((response) => response.json() as Promise<ChainStatus>)
        .then((data) => setChain(data))
        .catch(() => undefined);
    }, waiting ? 3_000 : 8_000);
    return () => window.clearInterval(poll);
  }, [waiting]);

  const liveWallet: PublicWallet | undefined = state?.user?.wallets.find(
    (item) => item.live,
  );
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
      if (typeof data.user?.balance === "number") publishBank(data.user.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setBusy(false);
    }
  }

  if (!state?.user) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl text-white">Add USDT</h1>
        <p className="mt-2 text-zinc-400">Opening your deposit address…</p>
      </main>
    );
  }

  const deposits = state.user.txs.filter((tx) => tx.type === "deposit");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl text-white">Add USDT</h1>
      <p className="mt-2 text-zinc-400">
        One address. Send at least {MIN_DEPOSIT} USDT on BNB Chain (BEP-20).
        Credit lands after {confirms} confirms. This page watches until it
        posts. Any other chain is gone — Huepot does not watch it.
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
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!busy && Number(amount) >= MIN_DEPOSIT) void credit();
              }}
            >
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
                disabled={busy || Number(amount) < MIN_DEPOSIT}
                type="submit"
              >
                {busy ? "Crediting…" : `Demo credit ${amount || "0"} USDT`}
              </button>
            </form>
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          {landed ? <p className="mt-3 text-sm text-zinc-300">{landed}</p> : null}
          {waiting && !landed ? (
            <p className="mt-3 text-sm text-zinc-500">
              Waiting on chain. This list updates when credit lands.
            </p>
          ) : null}
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
