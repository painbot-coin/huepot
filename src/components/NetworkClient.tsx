"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MessageLink } from "@/components/MessageDock";
import { Avatar } from "@/components/Avatar";
import { NetworkChrome, SignInGate } from "@/components/NetworkChrome";
import type { NetworkCard, NetworkState, NetworkTab } from "@/lib/types";

function ageLabel(at: number | null, now: number) {
  if (!at) return "offline";
  const mins = Math.floor(Math.max(0, now - at) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function sinceLabel(at: number) {
  return new Date(at).toLocaleDateString();
}

export function NetworkClient() {
  const params = useSearchParams();
  const focus = params.get("u") ?? "";
  const startTab = (params.get("tab") as NetworkTab | null) ?? "pit";
  const [tab, setTab] = useState<NetworkTab>(
    startTab === "friends" || startTab === "requests" ? startTab : "pit",
  );
  const [q, setQ] = useState("");
  const [lookup, setLookup] = useState("");
  const [state, setState] = useState<NetworkState | null>(null);
  const [error, setError] = useState("");
  const [needSignIn, setNeedSignIn] = useState(false);
  const [booted, setBooted] = useState(false);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setLookup(q), 180);
    return () => window.clearTimeout(id);
  }, [q]);

  const load = useCallback(
    async (next?: Partial<{ tab: NetworkTab; q: string }>) => {
      const useTab = next?.tab ?? tab;
      const useQ = next?.q ?? lookup;
      const search = new URLSearchParams();
      search.set("tab", useTab);
      if (useQ) search.set("q", useQ);
      if (focus) search.set("u", focus);
      const response = await fetch(`/api/network?${search.toString()}`);
      if (response.status === 401) {
        setNeedSignIn(true);
        return;
      }
      const data = (await response.json()) as NetworkState & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not load network");
      setNeedSignIn(false);
      setState(data);
      setError("");
    },
    [tab, lookup, focus],
  );

  useEffect(() => {
    void load()
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load network");
      })
      .finally(() => setBooted(true));
  }, [load]);

  useEffect(() => {
    const poll = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 8_000);
    const ping = window.setInterval(() => {
      void fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ping", tab, q: lookup, u: focus }),
      }).catch(() => undefined);
    }, 15_000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(ping);
    };
  }, [load, tab, lookup, focus]);

  async function act(action: string, username: string) {
    setBusy(`${action}:${username}`);
    setError("");
    try {
      const response = await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, username, tab, q: lookup, u: focus }),
      });
      const data = (await response.json()) as NetworkState & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not update");
      setState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy("");
    }
  }

  if (!booted) {
    return (
      <NetworkChrome>
        <p className="px-4 py-16 text-center text-zinc-400">Opening the wing…</p>
      </NetworkChrome>
    );
  }
  if (needSignIn) return <SignInGate />;

  function openTab(next: NetworkTab) {
    setTab(next);
    void load({ tab: next }).catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load");
    });
  }

  return (
    <NetworkChrome you={state?.you}>
    <main className="li-main is-wide">
      <aside className="li-card li-manage">
        <p className="lobby-label">Company</p>
        <button
          className={tab === "friends" ? "is-on" : ""}
          onClick={() => openTab("friends")}
          type="button"
        >
          <span>Company</span>
          <b>{state?.you.friends ?? 0}</b>
        </button>
        <button
          className={tab === "requests" ? "is-on" : ""}
          onClick={() => openTab("requests")}
          type="button"
        >
          <span>Asks</span>
          <b>{state?.pendingIn ?? 0}</b>
        </button>
        <button
          className={tab === "pit" ? "is-on" : ""}
          onClick={() => openTab("pit")}
          type="button"
        >
          <span>In the pit</span>
        </button>
      </aside>
      <div className="li-col">
      <h1 className="font-display text-3xl text-white">
        {tab === "friends" ? "Company" : tab === "requests" ? "Asks" : "In the pit"}
      </h1>
      <p className="mt-2 text-zinc-400">
        {tab === "friends"
          ? "People already in your company."
          : tab === "requests"
            ? "Asks you sent or received."
            : "Everyone sitting the house. Send an ask."}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            { id: "pit", label: "In the pit" },
            { id: "friends", label: "Company" },
            { id: "requests", label: `Asks${state?.pendingIn ? ` · ${state.pendingIn}` : ""}` },
          ] as { id: NetworkTab; label: string }[]
        ).map((item) => (
          <button
            className={`chip-btn ${tab === item.id ? "" : "chip-btn-ghost"}`}
            key={item.id}
            onClick={() => openTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="mt-6 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Search seats
      </label>
      <input
        className="field mt-2"
        onChange={(event) => setQ(event.target.value)}
        placeholder="@username"
        value={q}
      />

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      {!state ? (
        <p className="mt-10 text-center text-zinc-500">Opening the wing…</p>
      ) : state.cards.length === 0 ? (
        <p className="mt-10 text-sm text-zinc-500">
          {tab === "friends"
            ? "No company yet. Open In the pit and send an ask."
            : tab === "requests"
              ? "No open invitations."
              : "No players match."}
        </p>
      ) : (
        <ul className="mt-8 space-y-2">
          {state.cards.map((card) => (
            <PlayerCard
              busy={busy}
              focus={focus}
              key={card.username}
              now={state.now}
              onAct={act}
              player={card}
            />
          ))}
        </ul>
      )}
      </div>
    </main>
    </NetworkChrome>
  );
}

function PlayerCard({
  player,
  now,
  focus,
  busy,
  onAct,
}: {
  player: NetworkCard;
  now: number;
  focus: string;
  busy: string;
  onAct: (action: string, username: string) => void;
}) {
  const locked = Boolean(busy);
  const highlighted = focus.toLowerCase() === player.username.toLowerCase();
  return (
    <li
      className={`ledger-row is-stack ${highlighted ? "is-waiting" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-white">
            <Avatar avatar={player.avatar} size="sm" username={player.username} />
            <span>
              <span
                className={`mr-2 inline-block h-2 w-2 rounded-full ${
                  player.online ? "bg-emerald-400" : "bg-zinc-600"
                }`}
              />
              <Link href={`/network/u/${encodeURIComponent(player.username)}`}>
                @{player.username}
              </Link>
            </span>
          </p>
          <p className="mt-1 text-xs text-zinc-400">{player.headline}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {player.online
              ? player.room
                ? `Online · sitting ${player.room.name}`
                : "Online"
              : `Offline · ${ageLabel(player.lastSeen, now)}`}
            {` · ${player.friends} in company · since ${sinceLabel(player.createdAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MessageLink username={player.username} />
          {player.room ? (
            <Link className="chip-btn chip-btn-ghost" href={`/rooms/${player.room.slug}`}>
              Sit with them
            </Link>
          ) : null}
          {player.relation === "none" ? (
            <button
              className="chip-btn"
              disabled={locked}
              onClick={() => onAct("request", player.username)}
              type="button"
            >
              Ask
            </button>
          ) : null}
          {player.relation === "outgoing" ? (
            <span className="chip-btn chip-btn-ghost pointer-events-none">Ask sent</span>
          ) : null}
          {player.relation === "incoming" ? (
            <>
              <button
                className="chip-btn"
                disabled={locked}
                onClick={() => onAct("accept", player.username)}
                type="button"
              >
                Accept
              </button>
              <button
                className="chip-btn chip-btn-ghost"
                disabled={locked}
                onClick={() => onAct("ignore", player.username)}
                type="button"
              >
                Ignore
              </button>
            </>
          ) : null}
          {player.relation === "friends" ? (
            <button
              className="chip-btn chip-btn-ghost"
              disabled={locked}
              onClick={() => onAct("unfriend", player.username)}
              type="button"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
