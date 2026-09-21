"use client";

import { useEffect, useState } from "react";
import { publishBank } from "@/lib/bank-sync";
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
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [houseReady, setHouseReady] = useState<boolean | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [left, setLeft] = useState<number | null>(null);

  async function load() {
    const response = await fetch("/api/state");
    const data = (await response.json()) as GameState;
    setState(data);
    if (typeof data.user?.balance === "number") {
      publishBank(data.user.balance, data.user.bonus);
    }
    if (!data.user) {
      window.location.href = "/signin";
      return;
    }
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
  }, []);

  const pending = withdrawals.some(isOpen);

  useEffect(() => {
    if (!pending) return;
    const poll = window.setInterval(() => void loadQueue(), 3000);
    return () => window.clearInterval(poll);
  }, [pending]);

  const wallet =
    state?.user?.wallets.find((item) => item.live) ?? state?.user?.wallets[0];

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
          networkId: wallet?.id ?? "bsc",
        }),
      });
      const data = (await response.json()) as GameState & {
        error?: string;
        payoutError?: string;
        withdrawals?: Withdrawal[];
        houseReady?: boolean;
      };
      if (!response.ok) throw new Error(data.error || "Withdraw failed");
      setLeft(Number(amount));
      setState(data);
      if (typeof data.user?.balance === "number") {
      publishBank(data.user.balance, data.user.bonus);
    }
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

  const canSend =
    Boolean(address.trim()) &&
    Number(amount) >= MIN_WITHDRAW &&
    !busy &&
    !pending;

  if (!state?.user) {
    return (
      <main className="app-page">
        <p className="hall-kicker">Leave the vault</p>
        <h1 className="font-display text-4xl text-white">Withdraw</h1>
        <p className="app-lead">Opening your vault…</p>
      </main>
    );
  }

  return (
    <main className="app-page">
      <p className="hall-kicker">Leave the vault</p>
      <h1 className="font-display text-4xl text-white">Withdraw</h1>
      <p className="app-lead">
        Cash out BEP-20 USDT. Min {MIN_WITHDRAW}, max {MAX_WITHDRAW} per send,
        {` ${MAX_DAILY_WITHDRAW}`} per day. If the house is short, the send stays
        queued and retries.
      </p>

      <section className="app-card">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Available
        </p>
        <p className="font-display text-3xl text-white">
          {formatUsdt(state.user.balance)} USDT
        </p>
        {(state.user.bonus ?? 0) > 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            {formatUsdt(state.user.bonus)} sit chips stay in the house.
          </p>
        ) : null}

        <p className="mt-6 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Network
        </p>
        <p className="mt-2 text-sm text-zinc-300">BNB Smart Chain · BEP-20 USDT</p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canSend) void send();
          }}
        >
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
          disabled={!canSend}
          type="submit"
        >
          {busy ? "Leaving…" : pending ? "Already sending" : "Leave with gold"}
        </button>
        </form>
        {left != null ? (
          <p className="vault-rite">Leaving the vault · {formatUsdt(left)} USDT</p>
        ) : null}
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
          <li className="ledger-row">
            No cash-outs yet. Sends land here.
          </li>
        ) : (
          withdrawals.map((item) => (
            <li
              className="ledger-row"
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
