"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { COOL_OFF_HOURS, SELF_EXCLUDE_DAYS } from "@/lib/limits";
import { formatUsdt } from "@/lib/money";
import type { PublicSession, PublicUser, Tx } from "@/lib/types";

const TX_LABEL: Record<Tx["type"], string> = {
  deposit: "In",
  withdraw: "Out",
  click: "Click",
  payout: "Win",
  refund: "Back",
  adjust: "Staff",
  rake: "House",
};

export function AccountClient() {
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/auth/me");
      const data = (await response.json()) as { user: PublicUser | null };
      if (!data.user) {
        window.location.href = "/signin";
        return;
      }
      setUser(data.user);
    })();
  }, []);

  if (!user) {
    return (
      <p className="px-4 py-16 text-center text-zinc-400">Loading account…</p>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl text-white">Account</h1>
      <p className="mt-2 text-zinc-400">
        Signed in as <strong className="text-zinc-200">@{user.username}</strong>
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Balance
          </p>
          <p className="font-display text-3xl text-white">
            {formatUsdt(user.balance)} USDT
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Wallets
          </p>
          <p className="font-display text-3xl text-white">
            {user.wallets.length}
          </p>
        </div>
      </section>

      <p className="mt-6 text-sm text-zinc-500">
        {user.emailVerified ? "Verified" : "Not verified"}
        {user.hasGoogle ? " · Google" : ""} · since{" "}
        {new Date(user.createdAt).toLocaleDateString()}
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {!user.emailVerified ? (
          <Link className="chip-btn" href="/verify-email">
            Verify email
          </Link>
        ) : null}
        <Link className="chip-btn" href="/invest">
          Invest
        </Link>
        <Link className="chip-btn chip-btn-ghost" href="/withdraw">
          Withdraw
        </Link>
        <LogoutButton />
      </div>

      <ProfileCard user={user} onUser={setUser} />
      <LimitsCard user={user} onUser={setUser} />
      <SecurityCard user={user} />
      <LedgerCard txs={user.txs} />

      <ul className="mt-10 space-y-2">
        {user.wallets.map((wallet) => (
          <li
            className="rounded-2xl border border-white/8 px-4 py-3"
            key={wallet.id}
          >
            <p className="text-sm text-white">
              {wallet.name}{" "}
              <span className="text-zinc-500">
                {wallet.standard} {wallet.asset}
              </span>
            </p>
            <p className="mt-1 break-all font-mono text-xs text-zinc-500">
              {wallet.address}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}

const LEDGER_FILTERS: { id: string; label: string; types?: Tx["type"][] }[] = [
  { id: "all", label: "All" },
  { id: "in", label: "In", types: ["deposit"] },
  { id: "out", label: "Out", types: ["withdraw"] },
  { id: "click", label: "Click", types: ["click"] },
  { id: "win", label: "Win", types: ["payout"] },
  { id: "back", label: "Back", types: ["refund"] },
  { id: "staff", label: "Staff", types: ["adjust", "rake"] },
];

function txSigned(tx: Tx) {
  const out = tx.type === "withdraw" || tx.type === "click" || tx.type === "rake" || tx.note.includes("debit");
  return out ? -tx.amount : tx.amount;
}

function withRunning(txs: Tx[]) {
  const oldestFirst = [...txs].sort((a, b) => a.createdAt - b.createdAt);
  let run = 0;
  const rows = oldestFirst.map((tx) => {
    run += txSigned(tx);
    return { ...tx, balance: run };
  });
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

function ProfileCard({
  user,
  onUser,
}: {
  user: PublicUser;
  onUser: (user: PublicUser) => void;
}) {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [current, setCurrent] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(body: Record<string, string>) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const response = await fetch("/api/account/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { user?: PublicUser; error?: string };
      if (!response.ok || !data.user) throw new Error(data.error || "Could not save");
      onUser({ ...user, ...data.user, txs: user.txs });
      setCurrent("");
      if (body.action === "email") {
        setNote("Confirm the new email. A link was sent if mail is on.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-display text-2xl text-white">Profile</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Name shows on the table. A new email must be verified before you click or invest.
      </p>
      <label className="mt-5 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Username
      </label>
      <div className="mt-2 flex gap-3">
        <input
          className="field"
          maxLength={20}
          onChange={(event) => setUsername(event.target.value)}
          value={username}
        />
        <button
          className="chip-btn"
          disabled={busy || username === user.username}
          onClick={() => void save({ action: "username", username })}
          type="button"
        >
          Save
        </button>
      </div>
      <label className="mt-5 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Email
      </label>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <input
          autoComplete="email"
          className="field sm:col-span-2"
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
        {user.hasPassword ? (
          <input
            autoComplete="current-password"
            className="field"
            onChange={(event) => setCurrent(event.target.value)}
            placeholder="Current password"
            type="password"
            value={current}
          />
        ) : null}
        <button
          className="chip-btn"
          disabled={busy || email === user.email}
          onClick={() => void save({ action: "email", email, current })}
          type="button"
        >
          Save email
        </button>
      </div>
      {note ? <p className="mt-3 text-sm text-amber-200/80">{note}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}

function LedgerCard({ txs }: { txs: Tx[] }) {
  const [filter, setFilter] = useState("all");
  const [days, setDays] = useState(0);
  const rows = withRunning(txs);
  const since = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;
  const picked = LEDGER_FILTERS.find((item) => item.id === filter);
  const visible = rows.filter((tx) => {
    if (since && tx.createdAt < since) return false;
    if (picked?.types && !picked.types.includes(tx.type)) return false;
    return true;
  });

  function download() {
    const lines = [
      "time,type,note,amount,balance",
      ...visible.map((tx) => {
        const amount = txSigned(tx);
        const cells = [
          new Date(tx.createdAt).toISOString(),
          tx.type,
          `"${tx.note.replace(/"/g, '""')}"`,
          amount.toFixed(2),
          tx.balance.toFixed(2),
        ];
        return cells.join(",");
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "huepot-ledger.csv";
    link.click();
    URL.revokeObjectURL(href);
  }

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-white">Ledger</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Clicks, wins, refunds, cash in and out. Balance after each move.
          </p>
        </div>
        <button
          className="chip-btn chip-btn-ghost"
          disabled={visible.length === 0}
          onClick={download}
          type="button"
        >
          CSV
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {LEDGER_FILTERS.map((item) => (
          <button
            className={`chip-btn ${filter === item.id ? "" : "chip-btn-ghost"}`}
            key={item.id}
            onClick={() => setFilter(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {[
          { id: 0, label: "All time" },
          { id: 1, label: "24h" },
          { id: 7, label: "7 days" },
          { id: 30, label: "30 days" },
        ].map((item) => (
          <button
            className={`chip-btn ${days === item.id ? "" : "chip-btn-ghost"}`}
            key={item.id}
            onClick={() => setDays(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No moves in this filter.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {visible.map((tx) => {
            const amount = txSigned(tx);
            return (
              <li
                className="flex items-start justify-between gap-3 rounded-2xl border border-white/8 px-4 py-3 text-sm"
                key={tx.id}
              >
                <div>
                  <p className="text-zinc-200">
                    <span className="mr-2 text-[10px] uppercase tracking-[0.16em] text-amber-200/80">
                      {TX_LABEL[tx.type]}
                    </span>
                    {tx.note}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(tx.createdAt).toLocaleString()} · bank {formatUsdt(tx.balance)}
                  </p>
                </div>
                <span className={amount < 0 ? "text-zinc-400" : "text-emerald-300"}>
                  {amount < 0 ? "−" : "+"}
                  {formatUsdt(Math.abs(amount))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function LimitsCard({
  user,
  onUser,
}: {
  user: PublicUser;
  onUser: (user: PublicUser) => void;
}) {
  const [cap, setCap] = useState(user.dailyLossCap ? String(user.dailyLossCap) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(body: Record<string, number>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { user?: PublicUser; error?: string };
      if (!response.ok || !data.user) throw new Error(data.error || "Could not save");
      onUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-display text-2xl text-white">Play limits</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Today’s play loss {formatUsdt(user.playLossToday)} USDT. Cool-off and
        self-exclude cannot be shortened once they start.
      </p>
      <label className="mt-5 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Daily loss cap
      </label>
      <div className="mt-2 flex gap-3">
        <input
          className="field"
          onChange={(event) => setCap(event.target.value)}
          placeholder="0 = no cap"
          value={cap}
        />
        <button
          className="chip-btn"
          disabled={busy}
          onClick={() => void save({ dailyLossCap: Number(cap || 0) })}
          type="button"
        >
          Save
        </button>
      </div>
      <p className="mt-5 text-[10px] uppercase tracking-[0.22em] text-zinc-500">Cool-off</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {COOL_OFF_HOURS.map((hours) => (
          <button
            className="chip-btn chip-btn-ghost"
            disabled={busy || user.blockKind === "frozen" || user.blockKind === "self-exclude"}
            key={hours}
            onClick={() => void save({ coolOffHours: hours })}
            type="button"
          >
            {hours === 168 ? "7 days" : hours === 24 ? "24 hours" : "1 hour"}
          </button>
        ))}
      </div>
      <p className="mt-5 text-[10px] uppercase tracking-[0.22em] text-zinc-500">Self-exclude</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SELF_EXCLUDE_DAYS.map((days) => (
          <button
            className="chip-btn chip-btn-ghost"
            disabled={busy}
            key={days}
            onClick={() => void save({ selfExcludeDays: days })}
            type="button"
          >
            {days} days
          </button>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}

function SecurityCard({ user }: { user: PublicUser }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadSessions() {
    const response = await fetch("/api/account/security");
    const data = (await response.json()) as { sessions?: PublicSession[] };
    setSessions(data.sessions ?? []);
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function post(body: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { sessions?: PublicSession[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not save");
      if (data.sessions) setSessions(data.sessions);
      if (body.action === "password") {
        setCurrent("");
        setNext("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-display text-2xl text-white">Sign-in</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Change your password and kick other devices. Reset also lives on the sign-in page.
      </p>
      {user.hasPassword ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            autoComplete="current-password"
            className="field"
            onChange={(event) => setCurrent(event.target.value)}
            placeholder="Current password"
            type="password"
            value={current}
          />
          <input
            autoComplete="new-password"
            className="field"
            minLength={8}
            onChange={(event) => setNext(event.target.value)}
            placeholder="New password"
            type="password"
            value={next}
          />
          <button
            className="chip-btn sm:col-span-2"
            disabled={busy || !current || next.length < 8}
            onClick={() => void post({ action: "password", current, next })}
            type="button"
          >
            Save password
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">This account signs in with Google.</p>
      )}
      <div className="mt-6 flex items-center justify-between gap-3">
        <h3 className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Devices</h3>
        <button
          className="chip-btn chip-btn-ghost"
          disabled={busy || sessions.filter((item) => !item.current).length === 0}
          onClick={() => void post({ action: "revoke-others" })}
          type="button"
        >
          Sign out others
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {sessions.map((session) => (
          <li
            className="flex items-start justify-between gap-3 rounded-2xl border border-white/8 px-4 py-3 text-sm"
            key={session.hint}
          >
            <div>
              <p className="text-zinc-200">
                {session.current ? "This device" : "Other device"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {session.userAgent.slice(0, 80) || "Unknown"} ·{" "}
                {new Date(session.createdAt).toLocaleString()}
              </p>
            </div>
            {session.current ? null : (
              <button
                className="chip-btn chip-btn-ghost"
                disabled={busy}
                onClick={() => void post({ action: "revoke", hint: session.hint })}
                type="button"
              >
                Kick
              </button>
            )}
          </li>
        ))}
      </ul>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
