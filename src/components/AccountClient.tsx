"use client";
import { HouseFloor, floorYou } from "@/components/HouseFloor";
import { HouseButton, HouseField, HouseTabs } from "@/components/HouseUi";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { Avatar } from "@/components/Avatar";
import { LogoutButton } from "@/components/LogoutButton";
import { publishBank } from "@/lib/bank-sync";
import { COOL_OFF_HOURS, SELF_EXCLUDE_DAYS } from "@/lib/limits";
import { CopyInvite } from "@/components/CopyInvite";
import { inviteSitLead } from "@/lib/invite-copy";
import { lastInviteCredit } from "@/lib/invite-rake";
import { hueExplorerTx, type HueClaim } from "@/lib/hue-claim";
import { hueHexOf } from "@/lib/hues";
import { formatUsdt } from "@/lib/money";
import { seatLabel, seatTag } from "@/lib/house-seats";
import type { ClassicHour, FogCup, NightHour, PublicSession, PublicUser, Tx } from "@/lib/types";
import { PAGE } from "@/lib/voice";

const TX_LABEL: Record<Tx["type"], string> = {
  deposit: "In",
  withdraw: "Out",
  click: "Click",
  payout: "Win",
  refund: "Back",
  adjust: "Staff",
  rake: "House",
  invite: "Invite",
  bonus: "Play credit",
  sit: "Play",
  mark: "Model",
  contract: "Contract",
  hire: "Hire",
};

const TABS = [
  { id: "you", label: "Profile" },
  { id: "vault", label: "Wallet" },
  { id: "invite", label: "Invite" },
  { id: "standing", label: "Standing" },
  { id: "ledger", label: "Activity" },
  { id: "limits", label: "Limits" },
  { id: "signin", label: "Sign-in" },
] as const;

type AccountTab = (typeof TABS)[number]["id"];

function parseTab(raw: string | null | undefined): AccountTab {
  const id = (raw ?? "").trim().toLowerCase();
  return TABS.some((tab) => tab.id === id) ? (id as AccountTab) : "you";
}

function coverStyle(cover: string): CSSProperties {
  if (cover.startsWith("hue:")) {
    const hex = hueHexOf(cover.slice(4));
    return hex ? { background: hex } : {};
  }
  if (cover.startsWith("https://")) {
    return {
      backgroundImage: `url("${cover}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return {};
}

function goTab(tab: AccountTab) {
  const href = tab === "you" ? "/account" : `/account?tab=${tab}`;
  window.history.replaceState(null, "", href);
}

export function AccountClient() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [hour, setHour] = useState<ClassicHour | null>(null);
  const [night, setNight] = useState<NightHour | null>(null);
  const [cup, setCup] = useState<FogCup | null>(null);
  const [tab, setTab] = useState<AccountTab>("you");
  const [place, setPlace] = useState<number | null>(null);
  const [coin, setCoin] = useState(0);

  useEffect(() => {
    setTab(parseTab(new URLSearchParams(window.location.search).get("tab")));
    void (async () => {
      const response = await fetch("/api/auth/me");
      const data = (await response.json()) as { user: PublicUser | null };
      if (!data.user) {
        window.location.href = "/signin?next=/account";
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
    void fetch("/api/hue")
      .then((response) => response.json() as Promise<{ coin?: number; place?: number | null }>)
      .then((data) => {
        setCoin(data.coin ?? 0);
        setPlace(typeof data.place === "number" ? data.place : null);
      })
      .catch(() => undefined);
  }, []);

  function open(next: AccountTab) {
    setTab(next);
    goTab(next);
  }

  if (!user) {
    return (
      <HouseFloor kicker={PAGE.account}>
        <p className="account-loading">Opening your account…</p>
      </HouseFloor>
    );
  }

  const me = `/network/u/${encodeURIComponent(user.username)}`;
  const seat = seatLabel(user.seat);
  const tag = seatTag(user.seat);

  return (
    <HouseFloor
      kicker={PAGE.account}
      side={
        <div>
          <p className="lobby-label">This account</p>
          <p className="account-side-stat">
            <strong>{formatUsdt(user.balance)} USDT</strong>
            <em>Balance</em>
          </p>
          <p className="account-side-stat">
            <strong>{formatUsdt(user.bonus)}</strong>
            <em>Sit chips · play only</em>
          </p>
          <p className="account-side-stat">
            <strong>{place ? `#${place}` : "—"}</strong>
            <em>{Math.floor(coin).toLocaleString()} HUE on the board</em>
          </p>
          <p className="account-side-stat">
            <strong className="is-code">{user.inviteCode || "—"}</strong>
            <em>Invite · rake share only</em>
          </p>
          <div className="li-profile-act">
            <HouseButton ghost href="/jobs/you">
              Applications
            </HouseButton>
            {user.manager || user.reviewer ? (
              <HouseButton ghost href="/manage">
                Manage
              </HouseButton>
            ) : null}
            <HouseButton ghost href="/board">
              Leaderboard
            </HouseButton>
            <HouseButton ghost href="/rooms/classic">
              Classic
            </HouseButton>
          </div>
        </div>
      }
      you={floorYou(user)}
    >
      <div className="house-stage">
        <section className="li-card overflow-hidden">
          <div
            className={`li-cover is-tall${user.cover?.startsWith("https://") ? " has-pic" : ""}${user.cover?.startsWith("hue:") ? " has-hue" : ""}`}
            style={coverStyle(user.cover ?? "")}
          />
          <div className="li-profile">
            <div className="li-profile-top">
              <Avatar avatar={user.avatar} size="lg" username={user.username} />
              <div className="li-profile-id">
                <h1>@{user.username}</h1>
                <p className="li-head">{user.headline || seat || "Huepot player"}</p>
                {tag ? (
                  <p className="li-profile-place">
                    <em className="seat-tag">{tag}</em>
                    {seat}
                  </p>
                ) : (
                  <p className="li-profile-place">
                    <Link href="/seat?next=/account">Pick a role</Link>
                  </p>
                )}
                <p className="li-profile-meta">
                  {user.email} · Google · Joined{" "}
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="li-profile-act">
              <HouseButton href={me}>
                View profile
              </HouseButton>
              <HouseButton href="/invest">
                Add USDT
              </HouseButton>
              <HouseButton ghost href="/withdraw">
                Withdraw
              </HouseButton>
              <LogoutButton />
            </div>
          </div>
        </section>

        <nav aria-label="Account sections" className="account-tabs">
          <HouseTabs
            items={TABS.map((item) => ({ id: item.id, label: item.label }))}
            onChange={(id) => open(id as AccountTab)}
            value={tab}
          />
        </nav>

        <section className="li-card account-pane">
          {tab === "you" ? <ProfileCard onUser={setUser} user={user} /> : null}
          {tab === "vault" ? <VaultCard user={user} /> : null}
          {tab === "invite" ? (
            <InviteCard cup={cup} hour={hour} night={night} user={user} />
          ) : null}
          {tab === "standing" ? (
            <StandingPane coin={coin} place={place} withdrawAddress={user.withdrawAddress} />
          ) : null}
          {tab === "ledger" ? <LedgerCard txs={user.txs} /> : null}
          {tab === "limits" ? <LimitsCard onUser={setUser} user={user} /> : null}
          {tab === "signin" ? <SecurityCard user={user} /> : null}
        </section>
      </div>
    </HouseFloor>
  );
}

function VaultCard({ user }: { user: PublicUser }) {
  const live = user.wallets.filter((wallet) => wallet.live);
  return (
    <div className="account-block">
      <p className="hall-kicker">Wallet</p>
      <h2>USDT on this account</h2>
      <p>
        Cash is USDT on BNB Chain. Play credits are play-only and not
        withdrawable. Invite is rake share only.
      </p>
      <div className="account-stats">
        <div>
          <em>Balance</em>
          <strong>{formatUsdt(user.balance)} USDT</strong>
        </div>
        <div>
          <em>Play credits</em>
          <strong>{formatUsdt(user.bonus)}</strong>
          <span>
            {user.bonus > 0 ? "Play only. Not withdrawable." : "Next chip at 00:00 UTC."}
          </span>
        </div>
        <div>
          <em>Invite earned</em>
          <strong>{formatUsdt(user.inviteEarned)} USDT</strong>
        </div>
      </div>
      <p className="guide-cta">
        <HouseButton href="/invest">
          Add USDT
        </HouseButton>
        <HouseButton ghost href="/withdraw">
          Withdraw
        </HouseButton>
      </p>
      {live.length ? (
        <ul className="account-wallets">
          {live.map((wallet) => (
            <li key={wallet.id}>
              <p>
                {wallet.name}{" "}
                <span>
                  {wallet.standard} {wallet.asset} · live
                </span>
              </p>
              <code>{wallet.address}</code>
            </li>
          ))}
        </ul>
      ) : (
        <p className="account-empty">No live deposit door yet. Add USDT to open one.</p>
      )}
    </div>
  );
}

function StandingPane({
  coin,
  place,
  withdrawAddress,
}: {
  coin: number;
  place: number | null;
  withdrawAddress: string;
}) {
  return (
    <div className="account-block">
      <p className="hall-kicker">Standing</p>
      <h2>On the board</h2>
      <p>
        HUE is standing from play. Not money. No price. Testnet claim is a
        mark, not a cash-out.
      </p>
      <div className="account-stats">
        <div>
          <em>Place</em>
          <strong>{place ? `#${place}` : "—"}</strong>
        </div>
        <div>
          <em>HUE</em>
          <strong>{Math.floor(coin).toLocaleString()}</strong>
        </div>
      </div>
      <p className="guide-cta">
        <HouseButton ghost href="/board">
          The board
        </HouseButton>
        <HouseButton ghost href="/rooms/classic">
          Play Classic
        </HouseButton>
      </p>
      <HueClaimCard withdrawAddress={withdrawAddress} />
    </div>
  );
}

const LEDGER_FILTERS: { id: string; label: string; types?: Tx["type"][] }[] = [
  { id: "all", label: "All" },
  { id: "in", label: "In", types: ["deposit", "invite", "bonus"] },
  { id: "out", label: "Out", types: ["withdraw", "mark"] },
  { id: "click", label: "Click", types: ["click"] },
  { id: "win", label: "Win", types: ["payout"] },
  { id: "back", label: "Back", types: ["refund"] },
  { id: "staff", label: "Staff", types: ["adjust", "rake"] },
  { id: "work", label: "Work", types: ["contract", "hire"] },
];

function txSigned(tx: Tx) {
  if (tx.type === "bonus") return 0;
  if (tx.type === "contract" || tx.type === "hire") return tx.amount;
  const out = tx.type === "withdraw" || tx.type === "click" || tx.type === "rake" || tx.type === "mark";
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
    <div className="account-block">
      <p className="hall-kicker">Invite</p>
      <h2>Invite</h2>
      <p>
        New Google accounts from your link are tagged once. When they sit and a
        house take is created from their losing clicks, you get 20% of that
        rake — not their stake, not a bank bonus. Cap{" "}
        {formatUsdt(user.inviteEarnedToday + user.inviteDailyLeft)} USDT per UTC
        day.
      </p>
      {sit ? <p className="account-note">{sit}</p> : null}
      <p className="account-code">{user.inviteCode || "—"}</p>
      <CopyInvite
        className="chip-btn"
        code={user.inviteCode}
        cup={cup}
        hour={hour?.hour}
        href="/signin"
        night={night?.hour}
      />
      {last ? (
        <p className="account-note">
          Last credit {formatUsdt(last.amount)} USDT
          {last.from ? ` from @${last.from}` : ""}
          {last.room ? ` · ${last.room}` : ""}
        </p>
      ) : (
        <p className="account-empty">
          No invite credit yet. It lands after someone from your link sits a
          rake-making take.
        </p>
      )}
      <p className="account-note">
        Today {formatUsdt(user.inviteEarnedToday)} USDT ·{" "}
        {formatUsdt(user.inviteDailyLeft)} USDT left today · lifetime{" "}
        {formatUsdt(user.inviteEarned)} USDT
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
    <div className="account-claim">
      <h3>Claim HUE</h3>
      <p>Standing from play. Testnet only. Not USDT. No price.</p>
      <p className="account-code is-small">{Math.floor(coin).toLocaleString()} HUE</p>
      <p className="account-note">
        {booted
          ? configured
            ? `${claimable.toLocaleString()} left to claim`
            : "Send is off until the testnet token and hot key are set."
          : "Opening the book…"}
      </p>
      <HouseField
        label="BSC testnet address"
        onChange={(event) => setAddress(event.target.value)}
        placeholder="0x…"
        value={address}
      />
      <HouseButton
        disabled={busy || !configured || claimable < 1}
        onClick={() => void claim()}
      >
        {busy ? "Claiming…" : "Claim on testnet"}
      </HouseButton>
      {error ? <p className="account-err">{error}</p> : null}
      {note ? <p className="account-note">{note}</p> : null}
      {claims.length ? (
        <ul className="account-claims">
          {claims.map((row) => (
            <li key={row.id}>
              {row.amount} HUE · {row.status}
              {row.txHash ? (
                <>
                  {" · "}
                  <a href={hueExplorerTx(row.txHash)} rel="noreferrer" target="_blank">
                    BscScan
                  </a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
    <div className="account-block">
      <p className="hall-kicker">You</p>
      <h2>Profile</h2>
      <p>
        Name shows on the table and the network. Email comes from Google and stays
        with that account. Cover, role, and about sit on{" "}
        <Link href={`/network/u/${encodeURIComponent(user.username)}`}>your public profile</Link>.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (busy || username === user.username) return;
          void save({ action: "username", username });
        }}
      >
        <label>
          Username
          <span className="account-field-row">
            <HouseField
              inputProps={{ maxLength: 20 }}
              onChange={(event) => setUsername(event.target.value)}
              value={username}
            />
            <HouseButton disabled={busy || username === user.username} type="submit">
              {busy ? "Saving…" : "Save"}
            </HouseButton>
          </span>
        </label>
      </form>
      <label>
        Email
        <p className="account-note">{user.email}</p>
      </label>
      {error ? <p className="account-err">{error}</p> : null}
    </div>
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
    <div className="account-block">
      <div className="account-pane-head">
        <div>
          <p className="hall-kicker">Activity</p>
          <h2>Activity</h2>
          <p>Clicks, wins, refunds, cash in and out. Balance after each move.</p>
        </div>
        <HouseButton disabled={visible.length === 0} ghost onClick={download}>
          CSV
        </HouseButton>
      </div>
      <div className="account-chips">
        {LEDGER_FILTERS.map((item) => (
          <HouseButton
            ghost={filter !== item.id}
            key={item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </HouseButton>
        ))}
      </div>
      <div className="account-chips">
        {[
          { id: 0, label: "All time" },
          { id: 1, label: "24h" },
          { id: 7, label: "7 days" },
          { id: 30, label: "30 days" },
        ].map((item) => (
          <HouseButton
            ghost={days !== item.id}
            key={item.id}
            onClick={() => setDays(item.id)}
          >
            {item.label}
          </HouseButton>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="account-empty">No moves in this filter.</p>
      ) : (
        <ul className="account-ledger">
          {visible.map((tx) => {
            const amount = txSigned(tx);
            return (
              <li className="ledger-row" key={tx.id}>
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
    </div>
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
    <div className="account-block">
      <p className="hall-kicker">Seat limits</p>
      <h2>Play limits</h2>
      <p>
        Today’s play loss {formatUsdt(user.playLossToday)} USDT. A tighter cap
        holds at once; a looser one waits a day. Cool-off and self-exclude
        cannot be shortened once they start.
      </p>
      {user.pendingLossCap != null ? (
        <p className="account-warn">
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
        <label>
          Daily loss cap
          <span className="account-field-row">
            <HouseField
              onChange={(event) => setCap(event.target.value)}
              placeholder="0 = no cap"
              value={cap}
            />
            <HouseButton disabled={busy} type="submit">
              {busy ? "Saving…" : "Save"}
            </HouseButton>
          </span>
        </label>
      </form>
      <p className="account-sub">Cool-off</p>
      <div className="account-chips">
        {COOL_OFF_HOURS.map((hours) => (
          <HouseButton
            disabled={busy || user.blockKind === "frozen" || user.blockKind === "self-exclude"}
            ghost
            key={hours}
            onClick={() => void save({ coolOffHours: hours })}
          >
            {hours === 168 ? "7 days" : hours === 24 ? "24 hours" : "1 hour"}
          </HouseButton>
        ))}
      </div>
      <p className="account-sub">Self-exclude</p>
      <div className="account-chips">
        {SELF_EXCLUDE_DAYS.map((days) => (
          <HouseButton
            disabled={busy}
            ghost
            key={days}
            onClick={() => void save({ selfExcludeDays: days })}
          >
            {days} days
          </HouseButton>
        ))}
      </div>
      {error ? <p className="account-err">{error}</p> : null}
    </div>
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
    <div className="account-block">
      <p className="hall-kicker">This account</p>
      <h2>Sign-in</h2>
      <p>This account signs in with Google. Kick other devices here.</p>
      <div className="account-pane-head">
        <h3>Devices</h3>
        <HouseButton
          disabled={busy || sessions.filter((item) => !item.current).length === 0}
          ghost
          onClick={() => void post({ action: "revoke-others" })}
        >
          Sign out others
        </HouseButton>
      </div>
      <ul className="account-ledger">
        {sessions.map((session) => (
          <li className="ledger-row" key={session.hint}>
            <div>
              <p className="text-zinc-200">{session.current ? "This device" : "Other device"}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {session.userAgent.slice(0, 80) || "Unknown"} ·{" "}
                {new Date(session.createdAt).toLocaleString()}
              </p>
            </div>
            {session.current ? null : (
              <HouseButton
                disabled={busy}
                ghost
                onClick={() => void post({ action: "revoke", hint: session.hint })}
              >
                Kick
              </HouseButton>
            )}
          </li>
        ))}
      </ul>
      <h3>Your data</h3>
      <p>
        Everything Huepot holds about this account, as a file: the activity, the
        play record, your limits, and anything you posted.
      </p>
      <p className="guide-cta">
        <HouseButton ghost href="/api/account/export">
          Download my data
        </HouseButton>
      </p>
      <h3>Close this account</h3>
      <p>
        The role, the profile and every device go. Transaction rows stay,
        because they are the books too. Withdraw any balance first.
      </p>
      {closeOpen ? (
        <div className="account-field-row">
          <HouseField
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Type your username"
            value={confirm}
          />
          <HouseButton
            disabled={busy || !confirm.trim()}
            onClick={() => void closeSeat()}
          >
            {busy ? "Closing…" : "Close for good"}
          </HouseButton>
          <HouseButton ghost onClick={() => setCloseOpen(false)}>
            Keep it
          </HouseButton>
        </div>
      ) : (
        <p className="guide-cta">
          <HouseButton ghost onClick={() => setCloseOpen(true)}>
            Close my account
          </HouseButton>
        </p>
      )}
      {error ? <p className="account-err">{error}</p> : null}
    </div>
  );
}
