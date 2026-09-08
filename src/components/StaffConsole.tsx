"use client";

import { useEffect, useState } from "react";
import { formatUsdt } from "@/lib/money";
import type { Tx, Withdrawal } from "@/lib/types";
import type { StaffUserRow } from "@/lib/staff";

type Tab = "books" | "payouts" | "players" | "tables" | "ledger" | "reports" | "wire" | "log";
type ReportedPlayer = {
  username: string;
  open: number;
  total: number;
  hidden: number;
  reporters: number;
  lastAt: number;
};
type HeldNews = {
  id: string;
  source: string;
  tag: string;
  title: string;
  url: string;
};
type BooksWindow = {
  label: string;
  clicks: number;
  takes: number;
  rake: number;
  deposits: number;
  seats: number;
};
type Books = {
  totals: Record<string, number>;
  owed: number;
  implied: number;
  drift: number;
  doubleCredits: { groups: number; extra: number };
  treasury: { usdt: number; bnb: number; address: string; ready: boolean };
  cover: number;
  withdrawals: { status: string; n: number; usdt: number }[];
  players: { total: number; withBalance: number; everClicked: number };
  today: BooksWindow;
  week: BooksWindow;
};
type LogRow = {
  id: string;
  at: number;
  operator: string;
  ip: string;
  action: string;
  target: string;
  note: string;
};
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
type InboxHold = { usdt: number; count: number };
type SweepRow = { address: string; amount: number; txHash: string; at: number };

export function StaffConsole() {
  const [secret, setSecret] = useState("");
  const [name, setName] = useState("staff");
  const [signedIn, setSignedIn] = useState(false);
  const [operator, setOperator] = useState("");
  const [tab, setTab] = useState<Tab>("payouts");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [canSend, setCanSend] = useState(false);
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [inboxes, setInboxes] = useState<InboxHold | null>(null);
  const [sweeps, setSweeps] = useState<SweepRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [users, setUsers] = useState<StaffUserRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [txs, setTxs] = useState<(Tx & { username?: string })[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reported, setReported] = useState<ReportedPlayer[]>([]);
  const [held, setHeld] = useState<HeldNews[]>([]);
  const [heldCount, setHeldCount] = useState(0);
  const [house, setHouse] = useState<{ balance: number; percent: string } | null>(null);
  const [books, setBooks] = useState<Books | null>(null);
  const [mail, setMail] = useState<{ queued: number; sent: number; failed: number } | null>(null);
  const [emailOn, setEmailOn] = useState(false);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");

  async function checkSession() {
    const response = await fetch("/api/staff/session");
    const data = (await response.json()) as { signedIn?: boolean; operator?: string };
    if (data.signedIn && data.operator) {
      setSignedIn(true);
      setOperator(data.operator);
      return true;
    }
    setSignedIn(false);
    return false;
  }

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, name }),
      });
      const data = (await response.json()) as { error?: string; operator?: string };
      if (!response.ok) throw new Error(data.error || "Could not sign in");
      setSecret("");
      setSignedIn(true);
      setOperator(data.operator ?? name);
      await load("payouts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/staff/logout", { method: "POST" });
    setSignedIn(false);
    setOperator("");
    setWithdrawals([]);
    setUsers([]);
    setLogs([]);
    setHouse(null);
    setTreasury(null);
  }

  async function load(next = tab) {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ tab: next });
      if (next === "players" && query) params.set("q", query);
      const response = await fetch(`/api/staff/console?${params}`);
      const data = (await response.json()) as {
        error?: string;
        withdrawals?: Withdrawal[];
        users?: StaffUserRow[];
        rooms?: RoomRow[];
        txs?: (Tx & { username?: string })[];
        reports?: ReportRow[];
        reported?: ReportedPlayer[];
      held?: HeldNews[];
        heldCount?: number;
        logs?: LogRow[];
        house?: { balance: number; percent: string };
        canSend?: boolean;
        treasury?: Treasury;
        inboxes?: InboxHold;
        sweeps?: SweepRow[];
        books?: Books;
        mail?: { queued: number; sent: number; failed: number };
        emailOn?: boolean;
        you?: { operator?: string };
      };
      if (response.status === 401) {
        setSignedIn(false);
        throw new Error(data.error || "Sign in to the staff desk.");
      }
      if (!response.ok) throw new Error(data.error || "Could not load staff");
      if (data.withdrawals) setWithdrawals(data.withdrawals);
      if (data.users) setUsers(data.users);
      if (data.rooms) setRooms(data.rooms);
      if (data.txs) setTxs(data.txs);
      if (data.reports) setReports(data.reports);
      if (data.reported) setReported(data.reported);
      if (data.held) setHeld(data.held);
      if (typeof data.heldCount === "number") setHeldCount(data.heldCount);
      if (data.logs) setLogs(data.logs);
      if (data.house) setHouse(data.house);
      if (typeof data.canSend === "boolean") setCanSend(data.canSend);
      if (data.treasury) setTreasury(data.treasury);
      if (data.inboxes) setInboxes(data.inboxes);
      if (data.sweeps) setSweeps(data.sweeps);
      if (data.books) setBooks(data.books);
      if (data.mail) setMail(data.mail);
      if (typeof data.emailOn === "boolean") setEmailOn(data.emailOn);
      if (data.you?.operator) setOperator(data.you.operator);
      setSignedIn(true);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        error?: string;
        withdrawals?: Withdrawal[];
        users?: StaffUserRow[];
        rooms?: RoomRow[];
        reports?: ReportRow[];
        reported?: ReportedPlayer[];
      held?: HeldNews[];
        heldCount?: number;
        treasury?: Treasury;
        inboxes?: InboxHold;
        sweeps?: SweepRow[];
      };
      if (response.status === 401) {
        setSignedIn(false);
        throw new Error(data.error || "Sign in to the staff desk.");
      }
      if (!response.ok) throw new Error(data.error || "Could not update");
      if (data.withdrawals) setWithdrawals(data.withdrawals);
      if (data.users) setUsers(data.users);
      if (data.rooms) setRooms(data.rooms);
      if (data.reports) setReports(data.reports);
      if (data.reported) setReported(data.reported);
      if (data.held) setHeld(data.held);
      if (typeof data.heldCount === "number") setHeldCount(data.heldCount);
      if (data.treasury) setTreasury(data.treasury);
      if (data.inboxes) setInboxes(data.inboxes);
      if (data.sweeps) setSweeps(data.sweeps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void checkSession().then((ok) => {
      if (ok) void load("payouts");
    });
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl text-white">Staff</h1>
      <p className="mt-2 text-zinc-400">
        {signedIn
          ? `Signed in as ${operator}. Session lasts 4 hours and stays on this network.`
          : "Sign in once. The secret is not kept in the page after that."}
        {signedIn && canSend
          ? " Cash-outs send themselves. Send retries a queued payout if the house was short. Paid is for a send you already made outside the pit."
          : signedIn
            ? " Set WITHDRAW_KEY to send on-chain. Paid still marks a manual send."
            : ""}
      </p>

      {signedIn ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="chip-btn chip-btn-ghost" disabled={busy} onClick={() => void signOut()} type="button">
            Sign out
          </button>
        </div>
      ) : (
        <form
          className="mt-6 flex flex-wrap gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void signIn();
          }}
        >
          <input
            className="field"
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            value={name}
          />
          <input
            className="field"
            onChange={(event) => setSecret(event.target.value)}
            placeholder="Staff secret"
            type="password"
            value={secret}
          />
          <button className="chip-btn justify-center whitespace-nowrap" disabled={busy || !secret} type="submit">
            {busy ? "Openingâ€¦" : "Sign in"}
          </button>
        </form>
      )}
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {house ? (
        <p className="mt-4 text-sm text-zinc-300">
          House bank {formatUsdt(house.balance)} USDT Â· {house.percent} of each losing pot.
        </p>
      ) : null}
      {treasury?.address ? (
        <p className="mt-2 break-all text-sm text-zinc-300">
          Send wallet {treasury.address} Â· {formatUsdt(treasury.usdt)} USDT Â· {treasury.bnb.toFixed(4)} BNB
          {treasury.ready
            ? " Â· funded"
            : " Â· fund this address on BNB Chain with BEP-20 USDT and a little BNB"}
        </p>
      ) : null}
      {inboxes ? (
        <p className="mt-2 text-sm text-zinc-300">
          Player inboxes {formatUsdt(inboxes.usdt)} USDT
          {inboxes.count ? ` Â· ${inboxes.count} address${inboxes.count === 1 ? "" : "es"}` : ""}
          . Deposits sit there until swept. After a sweep, house take stays in the send wallet.
        </p>
      ) : null}
      {signedIn ? (
      <div className="mt-6 flex flex-wrap gap-2">
        {(["books", "payouts", "players", "tables", "ledger", "reports", "wire", "log"] as Tab[]).map((item) => (
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
      ) : null}

      {signedIn && tab === "books" && books ? (
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-white/8 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Cover</p>
            <p
              className={`mt-1 text-2xl ${books.cover < 0 ? "text-red-300" : "text-emerald-300"}`}
            >
              {formatUsdt(books.cover)} USDT
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Treasury {formatUsdt(books.treasury.usdt)} USDT minus{" "}
              {formatUsdt(books.owed)} owed to players.
              {books.cover < 0
                ? " Negative: the house cannot pay everyone out."
                : " Positive: player balances are covered."}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Gas {books.treasury.bnb.toFixed(4)} BNB Â·{" "}
              {books.treasury.ready ? "send wallet ready" : "send wallet not ready"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Receipts</p>
            <p
              className={`mt-1 text-2xl ${mail && mail.failed > 0 ? "text-amber-300" : "text-zinc-200"}`}
            >
              {!emailOn
                ? "no mail configured"
                : mail && mail.failed > 0
                  ? `${mail.failed} undelivered`
                  : `${mail?.sent ?? 0} sent`}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {!emailOn
                ? "A player who is not on the site cannot be told their money moved. Set EMAIL_PROVIDER, EMAIL_KEY and EMAIL_FROM to turn this on."
                : `${mail?.queued ?? 0} waiting, ${mail?.sent ?? 0} sent, ${mail?.failed ?? 0} gave up after five tries.`}
            </p>
            {emailOn ? (
              <button
                className="mt-2 text-sm underline"
                onClick={() => void act({ action: "mail-drain" })}
                type="button"
              >
                Send what is waiting now
              </button>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/8 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Reconciliation</p>
            <p
              className={`mt-1 text-2xl ${books.drift === 0 ? "text-emerald-300" : "text-amber-300"}`}
            >
              {books.drift === 0 ? "balanced" : `${formatUsdt(books.drift)} USDT drift`}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Balances rebuilt from the ledger come to {formatUsdt(books.implied)} USDT.
              {books.drift === 0
                ? " Every balance matches its rows."
                : " A balance moved without a matching row â€” check the accounts before trusting the totals."}
            </p>
            {books.doubleCredits?.groups ? (
              <p className="mt-2 text-sm text-amber-300">
                {books.doubleCredits.groups} on-chain deposit
                {books.doubleCredits.groups === 1 ? "" : "s"} credited more than once
                â€” the ledger claims {formatUsdt(books.doubleCredits.extra)} USDT that
                arrived only once. Balances are unaffected; the deposit rows are.
              </p>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">
                No on-chain deposit appears twice.
              </p>
            )}
          </div>

          <ul className="space-y-2">
            {[books.today, books.week].map((w) => (
              <li className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={w.label}>
                <span className="text-zinc-200">{w.label}</span> Â· {w.clicks} clicks Â·{" "}
                {w.takes} takes Â· rake {formatUsdt(w.rake)} Â· deposits{" "}
                {formatUsdt(w.deposits)} Â· {w.seats} seat{w.seats === 1 ? "" : "s"}
              </li>
            ))}
          </ul>

          <ul className="space-y-2">
            {Object.entries(books.totals).map(([line, value]) => (
              <li className="flex justify-between gap-3 rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={line}>
                <span>{line}</span>
                <span className="text-zinc-200">{formatUsdt(value)} USDT</span>
              </li>
            ))}
          </ul>

          <p className="text-sm text-zinc-400">
            {books.players.total} account{books.players.total === 1 ? "" : "s"} Â·{" "}
            {books.players.everClicked} have ever clicked Â· {books.players.withBalance} hold a balance
          </p>

          <ul className="space-y-2">
            {books.withdrawals.length === 0 ? (
              <li className="text-sm text-zinc-500">No withdrawals have ever been requested.</li>
            ) : (
              books.withdrawals.map((row) => (
                <li className="flex justify-between gap-3 rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={row.status}>
                  <span>{row.status}</span>
                  <span className="text-zinc-200">
                    {row.n} Â· {formatUsdt(row.usdt)} USDT
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {signedIn && tab === "payouts" ? (
        <div className="mt-8 space-y-4">
        {canSend ? (
          <button
            className="chip-btn"
            disabled={busy || !inboxes?.count}
            onClick={() => void act({ action: "sweep" })}
            type="button"
          >
            {busy ? "Sweepingâ€¦" : "Sweep inboxes to send wallet"}
          </button>
        ) : null}
        {sweeps.length ? (
          <ul className="space-y-2">
            {sweeps.map((row) => (
              <li className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={row.txHash || `${row.address}-${row.at}`}>
                <p className="text-zinc-200">Swept {formatUsdt(row.amount)} USDT</p>
                <a
                  className="mt-1 inline-block break-all font-mono text-xs text-amber-200/80"
                  href={`https://bscscan.com/tx/${row.txHash}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {row.txHash.slice(0, 10)}â€¦{row.txHash.slice(-6)}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        <ul className="space-y-2">
          {withdrawals.map((row) => (
            <li className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={row.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-zinc-200">
                    @{row.username ?? "player"} Â· {formatUsdt(row.amount)} USDT
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
                      {row.txHash.slice(0, 10)}â€¦{row.txHash.slice(-6)}
                    </a>
                  ) : null}
                </div>
                {row.status === "queued" || row.status === "sending" ? (
                  <div className="flex gap-2">
                    {canSend && row.status === "queued" ? (
                      <button className="chip-btn" disabled={busy} onClick={() => void act({ action: "send", id: row.id })} type="button">
                        Send
                      </button>
                    ) : null}
                    <button className="chip-btn" disabled={busy} onClick={() => void act({ action: "paid", id: row.id })} type="button">
                      Paid
                    </button>
                    {row.status === "queued" ? (
                      <button className="chip-btn chip-btn-ghost" disabled={busy} onClick={() => void act({ action: "rejected", id: row.id })} type="button">
                        Reject
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        </div>
      ) : null}

      {signedIn && tab === "players" ? (
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
            placeholder="Adjust amount (+ or âˆ’)"
            value={amount}
          />
          <ul className="mt-4 space-y-2">
            {users.map((user) => (
              <li className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={user.id}>
                <p className="text-zinc-200">
                  @{user.username} Â· {formatUsdt(user.balance)} USDT
                  {user.frozen ? " Â· frozen" : ""}
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

      {signedIn && tab === "tables" ? (
        <ul className="mt-8 space-y-2">
          {rooms.map((room) => (
            <li className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={room.slug}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-zinc-200">
                    {room.name} Â· round #{room.roundNumber} Â· {room.status}
                  </p>
                  <p className="mt-1 text-xs">
                    {formatUsdt(room.pot)} USDT Â· {room.players} seated
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

      {signedIn && tab === "ledger" ? (
        <ul className="mt-8 space-y-2">
          {txs.map((tx) => (
            <li className="flex justify-between gap-3 rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={tx.id}>
              <span>
                @{tx.username ?? "player"} Â· {tx.note}
              </span>
              <span className="text-zinc-200">{formatUsdt(tx.amount)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {signedIn && tab === "log" ? (
        <ul className="mt-8 space-y-2">
          {logs.length === 0 ? (
            <li className="text-sm text-zinc-500">No staff actions yet.</li>
          ) : (
            logs.map((row) => (
              <li className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={row.id}>
                <p className="text-zinc-200">
                  {row.operator} Â· {row.action} Â· {row.target}
                </p>
                <p className="mt-1 text-xs">
                  {new Date(row.at).toLocaleString()} Â· {row.ip}
                  {row.note ? ` Â· ${row.note}` : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {signedIn && tab === "reports" && reported.length ? (
        <div className="mt-8">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            By player, most-complained first
          </p>
          <ul className="mt-3 space-y-2">
            {reported.map((row) => (
              <li
                className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400"
                key={row.username}
              >
                <p className="text-zinc-200">
                  @{row.username} · {row.reporters} separate reporter
                  {row.reporters === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-xs uppercase tracking-widest">
                  {row.open} open · {row.total} in total · {row.hidden} hidden ·
                  last {new Date(row.lastAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {signedIn && tab === "reports" ? (
        <ul className="mt-8 space-y-2">
          {reports.map((row) => (
            <li className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400" key={row.id}>
              <p className="text-zinc-200">
                @{row.username} Â· /{row.roomSlug}
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

      {signedIn && tab === "wire" ? (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-400">
              {heldCount} headline{heldCount === 1 ? "" : "s"} waiting. Nothing
              reaches the wire until it is published here.
            </p>
            <button
              className="chip-btn chip-btn-ghost"
              disabled={busy}
              onClick={() => void act({ action: "wire-fetch" })}
              type="button"
            >
              {busy ? "Fetchingâ€¦" : "Fetch now"}
            </button>
          </div>
          <ul className="mt-4 space-y-2">
            {held.map((row) => (
              <li
                className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-zinc-400"
                key={row.id}
              >
                <p className="text-zinc-200">{row.title}</p>
                <p className="mt-1 text-xs uppercase tracking-widest">
                  {row.source} Â· {row.tag}
                </p>
                <p className="mt-1 break-all text-xs text-zinc-500">{row.url}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    className="chip-btn"
                    disabled={busy}
                    onClick={() => void act({ action: "wire-publish", id: row.id })}
                    type="button"
                  >
                    Publish
                  </button>
                  <button
                    className="chip-btn chip-btn-ghost"
                    disabled={busy}
                    onClick={() => void act({ action: "wire-drop", id: row.id })}
                    type="button"
                  >
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {held.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Nothing waiting. Headlines arrive within a quarter of an hour.
            </p>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
