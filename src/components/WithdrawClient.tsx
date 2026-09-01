"use client";

import { useEffect, useState } from "react";
import {
  MAX_DAILY_WITHDRAW,
  MAX_WITHDRAW,
  MIN_WITHDRAW,
} from "@/lib/config";
import { formatUsdt } from "@/lib/money";
import type { GameState, Withdrawal } from "@/lib/types";

const EXPLORER = "https://bscscan.com";

function statusLabel(status: Withdrawal["status"]) {
  if (status === "queued" || status === "sending") return "Sending";
  if (status === "paid") return "Sent";
  return "Rejected — bank refunded";
}

function isOpen(item: Withdrawal) {
  return item.status === "queued" || item.status === "sending";
}

export function WithdrawClient() {
  const [state, setState] = useState<GameState | null>(null);
  const [networkId, setNetworkId] = useState("");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [houseReady, setHouseReady] = useState<boolean | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

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

  async function loadQueue() {
    try {
      const response = await fetch("/api/withdraw");
      const data = (await response.json()) as {
        withdrawals?: Withdrawal[];
        houseReady?: boolean;
      };
      if (!response.ok) return;
      if (Array.isArray(data.withdrawals)) {
        setWithdrawals(data.withdrawals);
        if (data.withdrawals.some((item) => item.status === "paid" && item.txHash)) {
          setError((current) =>
            /short|queued and will/i.test(current) ? "" : current,
          );
        }
      }
      if (typeof data.houseReady === "boolean") setHouseReady(data.houseReady);
    } catch {
      /* keep last */
    }
  }

  useEffect(() => {
    void load();
    void loadQueue();
    void fetch("/api/auth/providers")
      .then((response) => response.json() as Promise<{ liveWithdrawals?: boolean }>)
      .then((data) => setLive(Boolean(data.liveWithdrawals)))
      .catch(() => undefined);
  }, []);

  const pending = withdrawals.some(isOpen);

  useEffect(() => {
    if (!pending) return;
    const poll = window.setInterval(() => void loadQueue(), 3000);
    return () => window.clearInterval(poll);
  }, [pending]);

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
      const data = (await response.json()) as GameState & {
        error?: string;
        payoutError?: string;
        withdrawals?: Withdrawal[];
        houseReady?: boolean;
      };
      if (!response.ok) throw new Error(data.error || "Withdraw failed");
      setState(data);
      setAmount("");
      if (Array.isArray(data.withdrawals)) setWithdrawals(data.withdrawals);
      if (typeof data.houseReady === "boolean") setHouseReady(data.houseReady);
      if (data.payoutError) setError(data.payoutError);
      void load();
      void loadQueue();
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

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="font-display text-4xl text-white">Withdraw</h1>
      <p className="mt-2 text-zinc-400">
        Cash out USDT on BNB Chain. Minimum {MIN_WITHDRAW} USDT, max {MAX_WITHDRAW}{" "}
        USDT per send, {MAX_DAILY_WITHDRAW} USDT per day. Huepot sends from the
        house wallet when you confirm. If the house is short, it stays queued and
        retries. This page watches until BscScan lands.
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
          placeholder="0x…"
          value={address}
        />

        <label className="mt-4 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Amount
        </label>
        <input
          className="field"
          min={MIN_WITHDRAW}
          max={MAX_WITHDRAW}
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
          {busy ? "Sending…" : "Withdraw"}
        </button>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        {houseReady === false ? (
          <p className="mt-3 text-sm text-zinc-500">
            House is topping the pot. Queued cash-outs retry on their own.
          </p>
        ) : pending ? (
          <p className="mt-3 text-sm text-zinc-500">
            Sending. This list updates when the tx lands.
          </p>
        ) : null}
      </section>

      <ul className="mt-8 space-y-2">
        {withdrawals.length === 0 ? (
          <li className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-500">
            No cash-outs yet. Sends land here.
          </li>
        ) : (
          withdrawals.map((item) => (
            <li
              className="flex justify-between gap-3 rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400"
              key={item.id}
            >
              <span>
                {statusLabel(item.status)}
                {item.txHash ? (
                  <>
                    {" · "}
                    <a
                      className="underline decoration-white/20 underline-offset-4"
                      href={`${EXPLORER}/tx/${item.txHash}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      BscScan
                    </a>
                  </>
                ) : isOpen(item) ? (
                  " · watching"
                ) : null}
              </span>
              <span className="text-zinc-200">{formatUsdt(item.amount)} USDT</span>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
