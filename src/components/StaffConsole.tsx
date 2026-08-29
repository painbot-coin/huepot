"use client";

import { useState } from "react";
import { formatUsdt } from "@/lib/money";
import type { Tx, Withdrawal } from "@/lib/types";
import type { StaffUserRow } from "@/lib/staff";

type Tab = "payouts" | "players" | "tables" | "ledger" | "reports";
type ReportRow = {
  id: string;
  roomSlug: string;
  username: string;
  body: string;
  status: string;
  createdAt: number;
};
type RoomRow = {
  slug: string;
  name: string;
  kind: string;
  status: string;
  roundNumber: number;
  pot: number;
  players: number;
  live: boolean;
};

type Treasury = {
  canSend: boolean;
  address: string;
  usdt: number;
  bnb: number;
  ready: boolean;
};

export function StaffConsole() {
  const [secret, setSecret] = useState("");
  const [tab, setTab] = useState<Tab>("payouts");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [canSend, setCanSend] = useState(false);
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [users, setUsers] = useState<StaffUserRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [txs, setTxs] = useState<(Tx & { username?: string })[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [house, setHouse] = useState<{ balance: number; percent: string } | null>(null);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");

  async function load(next = tab) {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ tab: next });
      if (next === "players" && query) params.set("q", query);
      const response = await fetch(`/api/staff/console?${params}`, {
        headers: { "x-admin-secret": secret },
      });
      const data = (await response.json()) as {
        error?: string;
        withdrawals?: Withdrawal[];
        users?: StaffUserRow[];
        rooms?: RoomRow[];
        txs?: (Tx & { username?: string })[];
        reports?: ReportRow[];
        house?: { balance: number; percent: string };
        canSend?: boolean;
        treasury?: Treasury;
      };
      if (!response.ok) throw new Error(data.error || "Could not load staff");
      if (data.withdrawals) setWithdrawals(data.withdrawals);
      if (data.users) setUsers(data.users);
      if (data.rooms) setRooms(data.rooms);
      if (data.txs) setTxs(data.txs);
      if (data.reports) setReports(data.reports);
      if (data.house) setHouse(data.house);
      if (typeof data.canSend === "boolean") setCanSend(data.canSend);
      if (data.treasury) setTreasury(data.treasury);
      setTab(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load staff");
    } finally {
      setBusy(false);
    }
  }

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/staff/console", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        error?: string;
        withdrawals?: Withdrawal[];
        users?: StaffUserRow[];
        rooms?: RoomRow[];
      };
      if (!response.ok) throw new Error(data.error || "Could not update");
      if (data.withdrawals) setWithdrawals(data.withdrawals);
      if (data.users) setUsers(data.users);
      if (data.rooms) setRooms(data.rooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl text-white">Staff</h1>
      <p className="mt-2 text-zinc-400">
        Payouts, player freezes, balance adjusts, and voiding a live round.
        {canSend
          ? " Send broadcasts BNB Chain USDT from the house wallet. Paid is for a send you already made outside the pit."
          : " Set WITHDRAW_KEY to send on-chain. Paid still marks a manual send."}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
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
          onClick={() => void load(tab)}
          type="button"
        >
          {busy ? "Loading…" : "Open"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {house ? (
        <p className="mt-4 text-sm text-zinc-300">
          House bank {formatUsdt(house.balance)} USDT · {house.percent} of each losing pot.
        </p>
      ) : null}
      {treasury?.address ? (
        <p className="mt-2 break-all text-sm text-zinc-300">
          Send wallet {treasury.address} · {formatUsdt(treasury.usdt)} USDT · {treasury.bnb.toFixed(4)} BNB
          {treasury.ready
            ? " · funded"
            : " · fund this address on BNB Chain with BEP-20 USDT and a little BNB"}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2">
        {(["payouts", "players", "tables", "ledger", "reports"] as Tab[]).map((item) => (
          <button
            className={`chip-btn ${tab === item ? "" : "chip-btn-ghost"}`}
            key={item}
            onClick={() => void load(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "payouts" ? (
        <ul className="mt-8 space-y-2">
          {withdrawals.map((row) => (
            <li className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={row.id}>
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
                {row.status === "queued" ? (
                  <div className="flex gap-2">
                    {canSend ? (
                      <button className="chip-btn" disabled={busy} onClick={() => void act({ action: "send", id: row.id })} type="button">
                        Send
                      </button>
                    ) : null}
                    <button className="chip-btn" disabled={busy} onClick={() => void act({ action: "paid", id: row.id })} type="button">
                      Paid
                    </button>
                    <button className="chip-btn chip-btn-ghost" disabled={busy} onClick={() => void act({ action: "rejected", id: row.id })} type="button">
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "players" ? (
        <section className="mt-8">
          <div className="flex gap-3">
            <input
              className="field"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search username or email"
              value={query}
            />
            <button className="chip-btn" disabled={busy} onClick={() => void load("players")} type="button">
              Search
            </button>
          </div>
          <input
            className="field mt-3"
            onChange={(event) => setNote(event.target.value)}
            placeholder="Reason / freeze note"
            value={note}
          />
          <input
            className="field mt-3"
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Adjust amount (+ or −)"
            value={amount}
          />
          <ul className="mt-4 space-y-2">
            {users.map((user) => (
              <li className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={user.id}>
                <p className="text-zinc-200">
                  @{user.username} · {formatUsdt(user.balance)} USDT
                  {user.frozen ? " · frozen" : ""}
                </p>
                <p className="mt-1 text-xs">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="chip-btn"
                    disabled={busy}
                    onClick={() => void act({ action: user.frozen ? "unfreeze" : "freeze", userId: user.id, note })}
                    type="button"
                  >
                    {user.frozen ? "Unfreeze" : "Freeze"}
                  </button>
                  <button
                    className="chip-btn chip-btn-ghost"
                    disabled={busy}
                    onClick={() => void act({ action: "adjust", userId: user.id, amount: Number(amount), note })}
                    type="button"
                  >
                    Adjust
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "tables" ? (
        <ul className="mt-8 space-y-2">
          {rooms.map((room) => (
            <li className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={room.slug}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-zinc-200">
                    {room.name} · round #{room.roundNumber} · {room.status}
                  </p>
                  <p className="mt-1 text-xs">
                    {formatUsdt(room.pot)} USDT · {room.players} seated
                  </p>
                </div>
                {room.live ? (
                  <button
                    className="chip-btn chip-btn-ghost"
                    disabled={busy}
                    onClick={() => void act({ action: "kill", slug: room.slug })}
                    type="button"
                  >
                    Void round
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "ledger" ? (
        <ul className="mt-8 space-y-2">
          {txs.map((tx) => (
            <li className="flex justify-between gap-3 rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={tx.id}>
              <span>
                @{tx.username ?? "player"} · {tx.note}
              </span>
              <span className="text-zinc-200">{formatUsdt(tx.amount)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "reports" ? (
        <ul className="mt-8 space-y-2">
          {reports.map((row) => (
            <li className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={row.id}>
              <p className="text-zinc-200">
                @{row.username} · /{row.roomSlug}
              </p>
              <p className="mt-1">{row.body}</p>
              <p className="mt-1 text-xs uppercase tracking-widest">{row.status}</p>
              {row.status === "open" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    className="chip-btn"
                    disabled={busy}
                    onClick={() => void act({ action: "hide-report", id: row.id })}
                    type="button"
                  >
                    Hide + mute
                  </button>
                  <button
                    className="chip-btn chip-btn-ghost"
                    disabled={busy}
                    onClick={() => void act({ action: "dismiss-report", id: row.id })}
                    type="button"
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
