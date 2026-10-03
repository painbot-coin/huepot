"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MessageLink } from "@/components/MessageDock";
import { Avatar } from "@/components/Avatar";
import { NetworkChrome, SignInGate } from "@/components/NetworkChrome";
import { HouseButton } from "@/components/HouseUi";
import {
  COMPANY_CLASSIC_HREF,
  sitClassicLabel,
  sitWithThemLabel,
} from "@/lib/company-door";
import { useCopy } from "@/components/LocaleRoot";
import { HOUSE_SEATS, seatOf, seatTag } from "@/lib/house-seats";
import { spokenSeat } from "@/lib/house-tongue";
import { LOCALES, localeMeta, parseLocale } from "@/lib/locale";
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

const FIND_BOOKS = [
  { id: "wait-down", label: "Down" },
  { id: "wait-burst", label: "Burst" },
  { id: "catch-first", label: "Catch" },
  { id: "snake-first", label: "Snake" },
  { id: "aim-first", label: "Aim" },
  { id: "lane-first", label: "Lane" },
  { id: "break-first", label: "Break" },
] as const;

export function NetworkClient() {
  const { locale } = useCopy();
  const params = useSearchParams();
  const focus = params.get("u") ?? "";
  const startTab = (params.get("tab") as NetworkTab | null) ?? "pit";
  const [tab, setTab] = useState<NetworkTab>(
    startTab === "friends" || startTab === "requests" ? startTab : "pit",
  );
  const [q, setQ] = useState("");
  const [lookup, setLookup] = useState("");
  const [seat, setSeat] = useState(seatOf(params.get("seat") ?? ""));
  const [lang, setLang] = useState(parseLocale(params.get("lang") ?? "") ?? "");
  const [book, setBook] = useState(
    FIND_BOOKS.some((row) => row.id === (params.get("book") ?? "")) ? (params.get("book") ?? "") : "",
  );
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
    async (next?: Partial<{ tab: NetworkTab; q: string; seat: string; lang: string; book: string }>) => {
      const useTab = next?.tab ?? tab;
      const useQ = next?.q ?? lookup;
      const useSeat = next?.seat ?? seat;
      const useLang = next?.lang ?? lang;
      const useBook = next?.book ?? book;
      const search = new URLSearchParams();
      search.set("tab", useTab);
      if (useQ) search.set("q", useQ);
      if (useSeat) search.set("seat", useSeat);
      if (useLang) search.set("lang", useLang);
      if (useBook) search.set("book", useBook);
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
    [tab, lookup, focus, seat, lang, book],
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
        body: JSON.stringify({ action: "ping", tab, q: lookup, u: focus, seat, lang, book }),
      }).catch(() => undefined);
    }, 15_000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(ping);
    };
  }, [load, tab, lookup, focus, seat, lang, book]);

  async function act(action: string, username: string) {
    setBusy(`${action}:${username}`);
    setError("");
    try {
      const response = await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, username, tab, q: lookup, u: focus, seat, lang, book }),
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
        <p className="px-4 py-16 text-center text-zinc-400">Opening people…</p>
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
    <main className="li-main is-directory">
      <aside className="li-card li-manage is-hidden-rail">
        <p className="lobby-label">People</p>
        <button
          className={tab === "friends" ? "is-on" : ""}
          onClick={() => openTab("friends")}
          type="button"
        >
          <span>Connections</span>
          <b>{state?.you.friends ?? 0}</b>
        </button>
        <button
          className={tab === "requests" ? "is-on" : ""}
          onClick={() => openTab("requests")}
          type="button"
        >
          <span>Requests</span>
          <b>{state?.pendingIn ?? 0}</b>
        </button>
        <button
          className={tab === "pit" ? "is-on" : ""}
          onClick={() => openTab("pit")}
          type="button"
        >
          <span>Playing</span>
        </button>
      </aside>
      <div className="li-col">
      <h1 className="font-display text-3xl text-white">
        {tab === "friends" ? "Connections" : tab === "requests" ? "Requests" : "Playing now"}
      </h1>
      <p className="mt-2 text-zinc-400">
        {tab === "friends"
          ? "People already in your network."
          : tab === "requests"
            ? "Requests you sent or received."
            : "A seat can be found by craft, language, or the book they sit. Company is a request both sides accept. A letter stays private."}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            { id: "pit", label: "Playing" },
            { id: "friends", label: "Connections" },
            { id: "requests", label: `Requests${state?.pendingIn ? ` · ${state.pendingIn}` : ""}` },
          ] as { id: NetworkTab; label: string }[]
        ).map((item) => (
          <HouseButton
            ghost={tab !== item.id}
            key={item.id}
            onClick={() => openTab(item.id)}
          >
            {item.label}
          </HouseButton>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Find a seat">
        {HOUSE_SEATS.map((row) => (
          <HouseButton
            ghost={seat !== row.id}
            key={row.id}
            onClick={() => {
              const next = seat === row.id ? "" : row.id;
              setSeat(next);
              void load({ seat: next }).catch((err) => {
                setError(err instanceof Error ? err.message : "Could not load");
              });
            }}
          >
            {spokenSeat(locale, row.id).tag}
          </HouseButton>
        ))}
      </div>

      <label className="mt-6 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Language
      </label>
      <select
        className="field mt-2"
        onChange={(event) => {
          const next = parseLocale(event.target.value) ?? "";
          setLang(next);
          void load({ lang: next }).catch((err) => {
            setError(err instanceof Error ? err.message : "Could not load");
          });
        }}
        value={lang}
      >
        <option value="">Any</option>
        {LOCALES.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Book they sit">
        {FIND_BOOKS.map((row) => (
          <HouseButton
            ghost={book !== row.id}
            key={row.id}
            onClick={() => {
              const next = book === row.id ? "" : row.id;
              setBook(next);
              void load({ book: next }).catch((err) => {
                setError(err instanceof Error ? err.message : "Could not load");
              });
            }}
          >
            {row.label}
          </HouseButton>
        ))}
      </div>

      <label className="mt-6 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Search seats
      </label>
      <input
        className="field mt-2"
        onChange={(event) => setQ(event.target.value)}
        placeholder="@name"
        value={q}
      />

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      {!state ? (
        <p className="mt-10 text-center text-zinc-500">Opening people…</p>
      ) : state.cards.length === 0 ? (
        <p className="mt-10 text-sm text-zinc-500">
          {tab === "friends"
            ? "No connections yet. Open Playing and send a request."
            : tab === "requests"
              ? "No open invitations."
              : seat || lang || book
                ? "No seats match. The house does not add one."
                : "No players match."}
        </p>
      ) : (
        <ul className="li-people-list">
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
  const line = player.room
    ? `Sitting ${player.room.name}`
    : player.online
      ? "In the house"
      : `Offline · ${ageLabel(player.lastSeen, now)}`;
  return (
    <li className={`li-people-row ${highlighted ? "is-on" : ""}`}>
      <Link
        className="li-suggest-who"
        href={`/network/u/${encodeURIComponent(player.username)}`}
      >
        <Avatar avatar={player.avatar} size="sm" username={player.username} />
        <span className="li-suggest-copy">
          <strong>@{player.username}</strong>
          <em>
            {line}
            {player.seat ? ` · ${seatTag(player.seat)}` : ""}
            {player.tongue ? ` · ${localeMeta(parseLocale(player.tongue) ?? "en").name}` : ""}
            {player.book ? ` · ${player.book}` : ""}
            {` · ${player.friends} in company · since ${sinceLabel(player.createdAt)}`}
          </em>
        </span>
      </Link>
      <div className="li-people-act">
        <MessageLink className="li-ask is-sent" username={player.username} />
        {player.room ? (
          <Link className="li-ask is-sent" href={`/rooms/${player.room.slug}`}>
            {sitWithThemLabel()}
          </Link>
        ) : player.relation === "friends" ? (
          <Link className="li-ask is-sent" href={COMPANY_CLASSIC_HREF}>
            {sitClassicLabel()}
          </Link>
        ) : null}
        {player.relation === "none" ? (
          <button
            className="li-ask"
            disabled={locked}
            onClick={() => onAct("request", player.username)}
            type="button"
          >
            Ask
          </button>
        ) : null}
        {player.relation === "outgoing" ? (
          <span className="li-ask is-sent">Sent</span>
        ) : null}
        {player.relation === "incoming" ? (
          <>
            <button
              className="li-ask"
              disabled={locked}
              onClick={() => onAct("accept", player.username)}
              type="button"
            >
              Accept
            </button>
            <button
              className="li-ask is-sent"
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
            className="li-ask is-sent"
            disabled={locked}
            onClick={() => onAct("unfriend", player.username)}
            type="button"
          >
            Remove
          </button>
        ) : null}
      </div>
    </li>
  );
}
