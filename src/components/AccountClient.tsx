"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { publishBank } from "@/lib/bank-sync";
import { COOL_OFF_HOURS, SELF_EXCLUDE_DAYS } from "@/lib/limits";
import { CopyInvite } from "@/components/CopyInvite";
import { inviteSitLead } from "@/lib/invite-copy";
import { lastInviteCredit } from "@/lib/invite-rake";
import { hueExplorerTx, type HueClaim } from "@/lib/hue-claim";
import { formatUsdt } from "@/lib/money";
import type { ClassicHour, FogCup, NightHour, PublicSession, PublicUser, Tx } from "@/lib/types";

const TX_LABEL: Record<Tx["type"], string> = {
  deposit: "In",
  withdraw: "Out",
  click: "Click",
  payout: "Win",
  refund: "Back",
  adjust: "Staff",
  rake: "House",
  invite: "Invite",
  bonus: "Sit chip",
  sit: "Sit",
};

export function AccountClient() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [hour, setHour] = useState<ClassicHour | null>(null);
  const [night, setNight] = useState<NightHour | null>(null);
  const [cup, setCup] = useState<FogCup | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/auth/me");
      const data = (await response.json()) as { user: PublicUser | null };
      if (!data.user) {
        window.location.href = "/signin";
        return;
      }
      setUser(data.user);
      publishBank(data.user.balance, data.user.bonus);
    })();
    void fetch("/api/rooms")
      .then(
        (response) =>
          response.json() as Promise<{
            classicHour?: ClassicHour;
            nightHour?: NightHour;
            fogCup?: FogCup;
          }>,
      )
      .then((data) => {
        if (data.classicHour) setHour(data.classicHour);
        if (data.nightHour) setNight(data.nightHour);
        if (data.fogCup) setCup(data.fogCup);
      })
      .catch(() => undefined);
  }, []);

  if (!user) {
    return (
      <main className="app-page">
        <p className="hall-kicker">The vault</p>
        <h1 className="font-display text-4xl text-white">Account</h1>
        <p className="app-lead">Opening your vault…</p>
      </main>
    );
  }

  return (
    <main className="app-page">
      <p className="hall-kicker">The vault</p>
      <h1 className="font-display text-4xl text-white">Account</h1>
      <p className="app-lead">
        Signed in as <strong className="text-zinc-200">@{user.username}</strong>
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StandingCard />
        <div className="app-card is-flush">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Balance
          </p>
          <p className="font-display text-3xl text-white">
            {formatUsdt(user.balance)} USDT
          </p>
        </div>
        <div className="app-card is-flush">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Sit chips
          </p>
          <p className="font-display text-3xl text-white">
            {formatUsdt(user.bonus)}{" "}
            <span className="text-base text-zinc-500">USDT</span>
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {user.bonus > 0
              ? "Play only. Not withdrawable."
              : "Next chip at 00:00 UTC. Play only."}
          </p>
        </div>
        <div className="app-card is-flush">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Invite earned
          </p>
          <p className="font-display text-3xl text-white">
            {formatUsdt(user.inviteEarned)}{" "}
            <span className="text-base text-zinc-500">USDT</span>
          </p>
        </div>
      </section>

      <p className="mt-6 text-sm text-zinc-500">
        {user.email} · Google · since{" "}
        {new Date(user.createdAt).toLocaleDateString()}
      </p>

      <div className="app-actions">
        <Link className="chip-btn" href="/invest">
          Add USDT
        </Link>
        <Link className="chip-btn chip-btn-ghost" href="/withdraw">
          Withdraw
        </Link>
        <LogoutButton />
      </div>

      <InviteCard cup={cup} hour={hour} night={night} user={user} />
      <HueClaimCard withdrawAddress={user.withdrawAddress} />
      <ProfileCard user={user} onUser={setUser} />
      <LimitsCard user={user} onUser={setUser} />
      <SecurityCard user={user} />
      <LedgerCard txs={user.txs} />

      <ul className="mt-10 space-y-2">
        {user.wallets
          .filter((wallet) => wallet.live)
          .map((wallet) => (
          <li
            className="ledger-row is-stack"
            key={wallet.id}
          >
            <p className="text-sm text-white">
              {wallet.name}{" "}
              <span className="text-zinc-500">
                {wallet.standard} {wallet.asset} · live
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
  { id: "in", label: "In", types: ["deposit", "invite", "bonus"] },
  { id: "out", label: "Out", types: ["withdraw"] },
  { id: "click", label: "Click", types: ["click"] },
  { id: "win", label: "Win", types: ["payout"] },
  { id: "back", label: "Back", types: ["refund"] },
  { id: "staff", label: "Staff", types: ["adjust", "rake"] },
];

function txSigned(tx: Tx) {
  // Sit chips are not cash. A bonus grant must not lift the running bank.
  // Sit rows are signed and offset a click or a refund, same as the books.
  if (tx.type === "bonus") return 0;
  // An adjust already carries its own sign; the rest take it from the type.
  const out = tx.type === "withdraw" || tx.type === "click" || tx.type === "rake";
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

function InviteCard({
  user,
  hour,
  night,
  cup,
}: {
  user: PublicUser;
  hour: ClassicHour | null;
  night: NightHour | null;
  cup: FogCup | null;
}) {
  const sit = inviteSitLead({ hour: hour?.hour, night: night?.hour, cup });
  const last = lastInviteCredit(user.txs);

  return (
    <section className="app-card">
      <p className="hall-kicker">Bring a seat</p>
      <h2 className="font-display text-2xl text-white">Invite</h2>
      <p className="mt-1 text-sm text-zinc-500">
        New Google accounts from your link are tagged once. When they sit and a
        house take is created from their losing clicks, you get 20% of that
        rake — not their stake, not a bank bonus. Cap {formatUsdt(user.inviteEarnedToday + user.inviteDailyLeft)} USDT
        per UTC day.
      </p>
      {sit ? <p className="mt-3 text-sm text-zinc-300">{sit}</p> : null}
      <p className="mt-5 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Your code
      </p>
      <p className="mt-2 font-mono text-2xl text-white">{user.inviteCode || "—"}</p>
      <CopyInvite
        className="chip-btn mt-4"
        code={user.inviteCode}
        cup={cup}
        hour={hour?.hour}
        href="/signin"
        night={night?.hour}
      />
      {last ? (
        <p className="mt-4 text-sm text-zinc-300">
          Last credit {formatUsdt(last.amount)} USDT
          {last.from ? ` from @${last.from}` : ""}
          {last.room ? ` · ${last.room}` : ""}
        </p>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          No invite credit yet. It lands after someone from your link sits a
          rake-making take.
        </p>
      )}
      <p className="mt-2 text-sm text-zinc-400">
        Today {formatUsdt(user.inviteEarnedToday)} USDT · {formatUsdt(user.inviteDailyLeft)} USDT left
        today · lifetime {formatUsdt(user.inviteEarned)} USDT
      </p>
    </section>
  );
}

function StandingCard() {
  const [coin, setCoin] = useState(0);
  const [place, setPlace] = useState<number | null>(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    void fetch("/api/hue")
      .then((response) => response.json() as Promise<{ coin?: number; place?: number | null }>)
      .then((data) => {
        setCoin(data.coin ?? 0);
        setPlace(typeof data.place === "number" ? data.place : null);
      })
      .catch(() => undefined)
      .finally(() => setBooted(true));
  }, []);

  return (
    <div className="app-card is-flush">
      <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        On the board
      </p>
      <p className="font-display text-3xl text-white">
        {booted && place ? `#${place}` : booted ? "—" : "…"}
      </p>
      <p className="mt-2 text-sm text-zinc-400">
        {Math.floor(coin).toLocaleString()} HUE
      </p>
      <p className="mt-2 text-sm text-zinc-500">
        <Link className="underline" href="/board">
          The board
        </Link>
        {" · "}
        <Link className="underline" href="/rooms/classic">
          Sit Classic
        </Link>
      </p>
    </div>
  );
}

function HueClaimCard({ withdrawAddress }: { withdrawAddress: string }) {
  const [address, setAddress] = useState(withdrawAddress);
  const [configured, setConfigured] = useState(false);
  const [coin, setCoin] = useState(0);
  const [claimable, setClaimable] = useState(0);
  const [claims, setClaims] = useState<HueClaim[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [booted, setBooted] = useState(false);

  async function load() {
    const response = await fetch("/api/hue");
    const data = (await response.json()) as {
      configured?: boolean;
      coin?: number;
      claimable?: number;
      claims?: HueClaim[];
      error?: string;
    };
    if (!response.ok) throw new Error(data.error || "Could not load HUE");
    setConfigured(Boolean(data.configured));
    setCoin(data.coin ?? 0);
    setClaimable(data.claimable ?? 0);
    if (Array.isArray(data.claims)) setClaims(data.claims);
  }

  useEffect(() => {
    void load()
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load HUE");
      })
      .finally(() => setBooted(true));
  }, []);

  async function claim() {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const response = await fetch("/api/hue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = (await response.json()) as {
        configured?: boolean;
        coin?: number;
        claimable?: number;
        claims?: HueClaim[];
        sendError?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not claim HUE");
      setConfigured(Boolean(data.configured));
      setCoin(data.coin ?? 0);
      setClaimable(data.claimable ?? 0);
      if (Array.isArray(data.claims)) setClaims(data.claims);
      if (data.sendError) setError(data.sendError);
      else setNote("Claim queued on BSC testnet.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not claim HUE");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="app-card">
      <p className="hall-kicker">The coin</p>
      <h2 className="font-display text-2xl text-white">Claim HUE</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Standing from play. Testnet only. Not USDT. No price.
      </p>
      <p className="mt-4 font-display text-3xl text-white">
        {Math.floor(coin).toLocaleString()} HUE
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        {booted
          ? configured
            ? `${claimable.toLocaleString()} left to claim`
            : "Send is off until the testnet token and hot key are set."
          : "Opening the book…"}
      </p>
      <label className="mt-5 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        BSC testnet address
      </label>
      <input
        className="field mt-2"
        onChange={(event) => setAddress(event.target.value)}
        placeholder="0x…"
        value={address}
      />
      <button
        className="chip-btn mt-4"
        disabled={busy || !configured || claimable < 1}
        onClick={() => void claim()}
        type="button"
      >
        {busy ? "Claiming…" : "Claim on testnet"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {note ? <p className="mt-3 text-sm text-zinc-300">{note}</p> : null}
      {claims.length ? (
        <ul className="mt-5 space-y-2">
          {claims.map((row) => (
            <li className="text-sm text-zinc-400" key={row.id}>
              {row.amount} HUE · {row.status}
              {row.txHash ? (
                <>
                  {" · "}
                  <a
                    className="text-zinc-200 underline"
                    href={hueExplorerTx(row.txHash)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    BscScan
                  </a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ProfileCard({
  user,
  onUser,
}: {
  user: PublicUser;
  onUser: (user: PublicUser) => void;
}) {
  const [username, setUsername] = useState(user.username);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(body: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { user?: PublicUser; error?: string };
      if (!response.ok || !data.user) throw new Error(data.error || "Could not save");
      onUser({ ...user, ...data.user, txs: user.txs });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="app-card">
      <p className="hall-kicker">Your seat</p>
      <h2 className="font-display text-2xl text-white">Profile</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Name shows on the table. Email comes from Google and stays with that account.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (busy || username === user.username) return;
          void save({ action: "username", username });
        }}
      >
      <label className="mt-5 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Username
      </label>
      <div className="mt-2 flex flex-wrap gap-3">
        <input
          className="field"
          maxLength={20}
          onChange={(event) => setUsername(event.target.value)}
          value={username}
        />
        <button
          className="chip-btn"
          disabled={busy || username === user.username}
          type="submit"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      </form>
      <label className="mt-5 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Email
      </label>
      <p className="mt-2 break-all text-sm text-zinc-300">{user.email}</p>
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
                className="ledger-row"
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
    <section className="app-card">
      <p className="hall-kicker">Seat limits</p>
      <h2 className="font-display text-2xl text-white">Play limits</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Today’s play loss {formatUsdt(user.playLossToday)} USDT. A tighter cap
        holds at once; a looser one waits a day. Cool-off and self-exclude
        cannot be shortened once they start.
      </p>
      {user.pendingLossCap != null ? (
        <p className="mt-2 text-sm text-amber-300">
          {user.pendingLossCap === 0
            ? "No cap"
            : `A cap of ${formatUsdt(user.pendingLossCap)} USDT`}{" "}
          starts {new Date(user.pendingLossCapAt).toLocaleString()}. Until then{" "}
          {formatUsdt(user.dailyLossCap)} USDT stands.
        </p>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          void save({ dailyLossCap: Number(cap || 0) });
        }}
      >
      <label className="mt-5 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Daily loss cap
      </label>
      <div className="mt-2 flex flex-wrap gap-3">
        <input
          className="field"
          onChange={(event) => setCap(event.target.value)}
          placeholder="0 = no cap"
          value={cap}
        />
        <button className="chip-btn" disabled={busy} type="submit">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      </form>
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

function SecurityCard({ user: _user }: { user: PublicUser }) {
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [closeOpen, setCloseOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
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

  async function closeSeat() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not close the account");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close the account");
    } finally {
      setBusy(false);
    }
  }

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="app-card">
      <p className="hall-kicker">This seat</p>
      <h2 className="font-display text-2xl text-white">Sign-in</h2>
      <p className="mt-1 text-sm text-zinc-500">
        This account signs in with Google. Kick other devices here.
      </p>
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
            className="ledger-row"
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

      <h3 className="mt-8 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Your data
      </h3>
      <p className="mt-2 text-sm text-zinc-500">
        Everything the house holds about this seat, as a file: the ledger, the
        play record, your limits, and anything you posted.
      </p>
      <p className="mt-3">
        <a className="chip-btn chip-btn-ghost" href="/api/account/export">
          Download my data
        </a>
      </p>

      <h3 className="mt-8 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Close this account
      </h3>
      <p className="mt-2 text-sm text-zinc-500">
        The seat, the profile and every device go. Transaction rows stay, because
        they are the house books too. Withdraw any balance first.
      </p>
      {closeOpen ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            className="field"
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Type your username"
            value={confirm}
          />
          <button
            className="chip-btn"
            disabled={busy || !confirm.trim()}
            onClick={() => void closeSeat()}
            type="button"
          >
            {busy ? "Closing…" : "Close for good"}
          </button>
          <button
            className="chip-btn chip-btn-ghost"
            onClick={() => setCloseOpen(false)}
            type="button"
          >
            Keep it
          </button>
        </div>
      ) : (
        <p className="mt-3">
          <button
            className="chip-btn chip-btn-ghost"
            onClick={() => setCloseOpen(true)}
            type="button"
          >
            Close my account
          </button>
        </p>
      )}
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
