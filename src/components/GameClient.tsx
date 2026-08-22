"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { CreateRoomForm } from "@/components/CreateRoomForm";
import {
  IconChat,
  IconCoin,
  IconHideLeft,
  IconPlus,
  IconShowLeft,
  IconShowRight,
  IconTable,
  IconUsers,
} from "@/components/Icons";
import { PadRune } from "@/components/PadRune";
import { PlayerBoard } from "@/components/PlayerBoard";
import { RoomFeed } from "@/components/RoomFeed";
import { SearchDock } from "@/components/SearchDock";
import { colorById, type ColorId } from "@/lib/colors";
import { REVEAL_SECONDS } from "@/lib/config";
import { emitFx } from "@/lib/fx";
import { formatClock, formatUsdt } from "@/lib/money";
import type { GameState, PublicRound } from "@/lib/types";

type Burst = { id: number; x: number; y: number; color: string };
type Spark = { id: number; colorId: ColorId };

async function readApi(path: string, init?: RequestInit): Promise<GameState> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = (await response.json()) as GameState & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function estimateIfWins(round: PublicRound, colorId: ColorId) {
  const colorClicks = round.totals[colorId];
  const yourClicks = round.yourClicks[colorId];
  if (colorClicks <= 0 || yourClicks <= 0) return 0;
  const losingClicks = round.totalClicks - colorClicks;
  const losingPot = losingClicks * round.clickPrice;
  return yourClicks * round.clickPrice + (yourClicks / colorClicks) * losingPot;
}

export function GameClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [pane, setPane] = useState<"play" | "rooms" | "table" | "chat">("play");
  const [railOpen, setRailOpen] = useState(true);
  const [newsOpen, setNewsOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const [busyColor, setBusyColor] = useState<ColorId | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [potPulse, setPotPulse] = useState(false);
  const skew = useRef(0);
  const lastPot = useRef(0);
  const lastStatus = useRef("");
  const lastRound = useRef(0);
  const urgentSent = useRef(false);
  const fogSent = useRef(false);
  const burstId = useRef(0);

  const applyState = useCallback((next: GameState) => {
    if (next.room.slug !== slug) return;
    skew.current = Date.now() - next.now;
    if (next.round.pot > lastPot.current) {
      setPotPulse(true);
      window.setTimeout(() => setPotPulse(false), 700);
      if (lastPot.current > 0) {
        emitFx({
          kind: "pot",
          color: "#ffb020",
          label: `Pot surge · ${formatUsdt(next.round.pot)} USDT`,
        });
      }
    }
    if (next.round.status === "revealing" && lastStatus.current !== "revealing") {
      const winnerId = next.round.result?.winners[0];
      if (winnerId) {
        const winner = colorById(winnerId);
        emitFx({
          kind: "take",
          color: winner.hex,
          label: `${winner.name} takes the pot`,
        });
      } else {
        emitFx({
          kind: "round",
          color: "#c9c4d8",
          label: "The board is back",
        });
      }
    }
    if (next.round.number !== lastRound.current && lastRound.current > 0) {
      urgentSent.current = false;
      fogSent.current = false;
      emitFx({
        kind: "round",
        color: "#2ea8ff",
        label: `Round #${next.round.number} live`,
      });
    }
    lastPot.current = next.round.pot;
    lastStatus.current = next.round.status;
    lastRound.current = next.round.number;
    setState(next);
  }, [slug]);

  const refresh = useCallback(async () => {
    try {
      applyState(await readApi(`/api/rooms/${slug}/state`));
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load game";
      setError(message);
      if (message.toLowerCase().includes("not open") && slug !== "classic") {
        router.replace("/rooms/classic");
      }
    }
  }, [applyState, router, slug]);

  useEffect(() => {
    lastPot.current = 0;
    lastStatus.current = "";
    lastRound.current = 0;
    urgentSent.current = false;
    fogSent.current = false;
    setState(null);
  }, [slug]);

  useEffect(() => {
    try {
      if (window.localStorage.getItem("huepot-rail") === "0") setRailOpen(false);
      if (window.localStorage.getItem("huepot-news") === "0") setNewsOpen(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("huepot-rail", railOpen ? "1" : "0");
      window.localStorage.setItem("huepot-news", newsOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [railOpen, newsOpen]);

  useEffect(() => {
    void refresh();
    const poll = window.setInterval(() => {
      void refresh();
    }, 700);
    const tick = window.setInterval(() => {
      setNow(Date.now() - skew.current);
    }, 100);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [refresh]);

  const remainingMs = useMemo(() => {
    if (!state) return 0;
    if (state.round.status === "revealing") {
      return (state.round.revealUntil ?? 0) - now;
    }
    return state.round.endsAt - now;
  }, [now, state]);

  useEffect(() => {
    if (!state || state.round.status !== "live") return;
    if (remainingMs > 0 && remainingMs < 10_000 && !urgentSent.current) {
      urgentSent.current = true;
      emitFx({ kind: "urgent", color: "#ff355e", label: "Final seconds" });
    }
  }, [remainingMs, state]);

  const boardFog = Boolean(
    state &&
      state.round.status === "live" &&
      (state.round.fog ||
        ((state.room.fogSeconds ?? 0) > 0 &&
          remainingMs <= (state.room.fogSeconds ?? 0) * 1000)),
  );

  useEffect(() => {
    if (!boardFog || fogSent.current) return;
    fogSent.current = true;
    emitFx({ kind: "fog", color: "#c9c4d8", label: "Fog on the board" });
  }, [boardFog]);

  const leader = useMemo(() => {
    if (!state || boardFog) return [];
    const ids = state.round.buttonIds;
    const max = Math.max(...ids.map((id) => state.round.totals[id]));
    if (max <= 0) return [];
    return ids.filter((id) => state.round.totals[id] === max);
  }, [boardFog, state]);

  async function onClick(colorId: ColorId, event: MouseEvent<HTMLButtonElement>) {
    if (!state || state.round.status !== "live" || !state.user) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const burst: Burst = {
      id: burstId.current++,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      color: colorById(colorId).hex,
    };
    setBursts((list) => [...list.slice(-8), burst]);
    setSparks((list) => [...list.slice(-6), { id: burst.id, colorId }]);
    emitFx({ kind: "click", color: colorById(colorId).hex });
    window.setTimeout(() => {
      setBursts((list) => list.filter((item) => item.id !== burst.id));
      setSparks((list) => list.filter((item) => item.id !== burst.id));
    }, 700);

    setBusyColor(colorId);
    setError("");
    try {
      applyState(
        await readApi(`/api/rooms/${slug}/click`, {
          method: "POST",
          body: JSON.stringify({ colorId }),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Click failed");
      void refresh();
    } finally {
      setBusyColor(null);
    }
  }

  if (!state) {
    return (
      <div className="loader-stage">
        <div className="loader-ring" />
        <p>{error || "Opening the arena…"}</p>
        {error ? (
          <Link className="underline" href="/">
            Back to rooms
          </Link>
        ) : null}
      </div>
    );
  }

  const { user, round, room, feed } = state;
  const rooms = state.rooms ?? [];
  const seats = state.seats ?? [];
  const table = round.buttonIds.map((id) => colorById(id));
  const liveLeft = room.closesAt ? room.closesAt - now : null;
  const revealing = round.status === "revealing";
  const fog = boardFog;
  const urgent = !revealing && remainingMs > 0 && remainingMs < 10_000;
  const canClick =
    Boolean(user?.emailVerified) &&
    !revealing &&
    (user?.balance ?? 0) >= round.clickPrice;
  const winner = round.result?.winners[0];
  const winnerColor = winner ? colorById(winner) : null;

  return (
    <div className="pit-app">
      <div className="pit-top">
        <SearchDock onPickRoom={(next) => router.push(`/rooms/${next}`)} />
        <button aria-label="Create room" className="pit-create" onClick={() => setCreating(true)} type="button">
          <IconPlus />
        </button>
      </div>
      <div className={`pit-grid ${railOpen ? "" : "is-rail-off"} ${newsOpen ? "" : "is-news-off"}`}>
        <aside className={`pit-rail ${pane === "rooms" ? "is-open" : ""} ${railOpen ? "" : "is-slim"}`}>
          <div className="pit-rail-head">
            <button
              aria-label="Hide rooms"
              className="pit-ico desk-only"
              onClick={() => setRailOpen(false)}
              type="button"
            >
              <IconHideLeft />
            </button>
            <button aria-label="Create room" className="pit-ico" onClick={() => setCreating(true)} type="button">
              <IconPlus />
            </button>
            <button
              aria-label="Show rooms"
              className="pit-ico pit-slim-open"
              onClick={() => setRailOpen(true)}
              type="button"
            >
              <IconShowLeft />
            </button>
          </div>
          <div className="pit-rail-list">
            {rooms.map((item) => (
              <button
                className={`pit-room ${item.slug === slug ? "is-on" : ""}`}
                key={item.slug}
                onClick={() => {
                  router.push(`/rooms/${item.slug}`);
                  setPane("play");
                }}
                type="button"
              >
                <strong>
                  {item.name}
                  <em className={`pit-kind is-${item.kind}`} title={item.kind === "basic" ? "No fee" : "Custom"} />
                </strong>
                <span>
                  {item.buttonCount} · {formatUsdt(item.clickPrice)} · {formatUsdt(item.pot)}
                  {item.closesAt ? ` · ${formatClock(item.closesAt - now)}` : ""}
                </span>
              </button>
            ))}
          </div>
        </aside>
        <div className={`pit-main ${pane === "play" ? "is-open" : ""}`}>
    <div className="game-stage mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:py-8">
      <p className="room-back">
        <span>{room.name}</span>
        <span>
          {room.buttonCount} coins · {formatUsdt(room.clickPrice)} USDT · {room.roundSeconds}s
          {liveLeft != null ? ` · table ${formatClock(liveLeft)}` : ""}
        </span>
      </p>
      {revealing && winnerColor ? (
        <div
          className="take-veil"
          style={
            {
              "--pad": winnerColor.hex,
              "--ink": winnerColor.ink,
              "--glow": winnerColor.glow,
            } as CSSProperties
          }
        >
          <PadRune id={winnerColor.id} />
          <p className="take-kicker">The pot is claimed</p>
          <p className="take-name">{winnerColor.name}</p>
        </div>
      ) : null}

      <section className={`arena ${revealing ? "is-revealing" : ""} ${urgent ? "is-urgent" : ""} ${fog ? "is-fog" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              {revealing ? "Winner lock" : `${room.name} · round #${round.number}`}
            </p>
            <p className={`font-display pot-value text-3xl text-white ${potPulse ? "is-pulse" : ""}`}>
              {formatUsdt(round.pot)}{" "}
              <span className="text-base text-zinc-500">USDT</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              {revealing ? "Next round" : fog ? "Fog · time left" : "Time left"}
            </p>
            <p className={`font-display clock-value text-3xl tabular-nums text-white ${urgent ? "is-urgent" : ""}`}>
              {formatClock(remainingMs)}
            </p>
          </div>
        </div>
        <div className={`timer-track ${urgent ? "is-urgent" : ""}`}>
          <div
            className="timer-fill"
            style={{
              width: `${Math.max(
                0,
                Math.min(
                  100,
                  (remainingMs /
                    (revealing
                      ? REVEAL_SECONDS * 1000
                      : round.endsAt - round.startedAt)) *
                    100,
                ),
              )}%`,
            }}
          />
        </div>
        <p className="text-sm leading-6 text-zinc-400">
          Every color costs{" "}
          <strong className="text-zinc-200">
            {formatUsdt(round.clickPrice)} USDT
          </strong>{" "}
          per click. The color with the most clicks takes the other colors’
          money and splits it by click.
          {room.fogSeconds
            ? ` Last ${room.fogSeconds} seconds, public counts go dark.`
            : ""}
        </p>
        {!user ? (
          <p className="text-sm text-zinc-300">
            <Link className="underline" href="/signin">
              Sign in
            </Link>{" "}
            or{" "}
            <Link className="underline" href="/signup">
              create an account
            </Link>{" "}
            to click. You can watch the round live either way.
          </p>
        ) : !user.emailVerified ? (
          <p className="text-sm text-zinc-300">
            <Link className="underline" href="/verify-email">
              Verify your email
            </Link>{" "}
            to click colors.
          </p>
        ) : null}
      </section>

      {revealing && round.result ? (
        <ResultCard result={round.result} playerId={user?.id ?? ""} />
      ) : null}

      {error ? (
        <p className="error-toast rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}{" "}
          {error.toLowerCase().includes("invest") ? (
            <Link className="underline" href="/invest">
              Open invest
            </Link>
          ) : null}
          {error.toLowerCase().includes("verify") ? (
            <Link className="underline" href="/verify-email">
              Verify email
            </Link>
          ) : null}
          {error.toLowerCase().includes("sign in") ? (
            <Link className="underline" href="/signin">
              Sign in
            </Link>
          ) : null}
        </p>
      ) : null}

      <div className="pad-grid">
        {table.map((color, index) => {
          const clicks = round.totals[color.id];
          const yours = round.yourClicks[color.id];
          const share =
            fog || round.totalClicks <= 0
              ? 0
              : (clicks / round.totalClicks) * 100;
          const leading = !fog && leader.includes(color.id);
          const estimated = fog ? 0 : estimateIfWins(round, color.id);
          const taken =
            revealing && round.result?.winners.includes(color.id);
          const dimmed = revealing && !taken;
          return (
            <div className="coin-slot" key={color.id}>
              <button
                type="button"
                disabled={!canClick}
                onClick={(event) => void onClick(color.id, event)}
                className={`color-pad ${busyColor === color.id ? "is-pressed" : ""} ${leading && !revealing ? "is-leading" : ""} ${taken ? "is-winner" : ""} ${dimmed ? "is-dimmed" : ""} ${fog ? "is-fog" : ""} ${sparks.some((item) => item.colorId === color.id) ? "is-spark" : ""}`}
                style={{
                  "--pad": color.hex,
                  "--ink": color.ink,
                  "--glow": color.glow,
                  animationDelay: `${index * 90}ms`,
                } as CSSProperties}
              >
                <span className="coin-reeds" />
                <span className="coin-core" />
                <span className="pad-sheen" />
                <span className="pad-orbit" />
                <PadRune id={color.id} />
                {bursts
                  .filter((burst) => burst.color === color.hex)
                  .map((burst) => (
                    <span
                      className="pad-burst"
                      key={burst.id}
                      style={{ left: burst.x, top: burst.y }}
                    />
                  ))}
                {leading && clicks > 0 ? (
                  <span className="lead-chip">Biggest</span>
                ) : null}
                <div className="coin-copy">
                  <span className="coin-name font-display">{color.name}</span>
                  <span className="count-pop coin-count font-display">
                    {fog ? "—" : clicks}
                  </span>
                  <span className="coin-you">You {yours}</span>
                </div>
              </button>
              <p className="coin-meta">
                {fog
                  ? "Board in fog"
                  : yours > 0
                    ? `If ${color.name} takes: ~${formatUsdt(estimated)} USDT`
                    : `1 click · ${formatUsdt(round.clickPrice)} USDT`}
              </p>
              <div className="coin-share">
                <div className="share-fill" style={{ width: `${share}%`, background: color.hex }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
        <div className="pit-table-desktop">
          <PlayerBoard buttonIds={round.buttonIds} fog={fog} seats={seats} />
        </div>
        </div>
        <div className={`pit-chat ${pane === "chat" ? "is-open" : ""} ${newsOpen ? "" : "is-slim"}`}>
          <RoomFeed
            feed={feed}
            onHide={() => setNewsOpen(false)}
            onState={applyState}
            slug={slug}
            user={user}
          />
          <button
            aria-label="Show news"
            className="pit-ico pit-slim-open"
            onClick={() => setNewsOpen(true)}
            type="button"
          >
            <IconShowRight />
          </button>
        </div>
        <div className={`pit-sheet ${pane === "table" ? "is-open" : ""}`}>
          <PlayerBoard buttonIds={round.buttonIds} fog={fog} seats={seats} />
        </div>
      </div>
      <nav className="pit-tabs">
        <button aria-label="Rooms" className={pane === "rooms" ? "is-on" : ""} onClick={() => setPane("rooms")} type="button">
          <IconUsers />
        </button>
        <button aria-label="Play" className={pane === "play" ? "is-on" : ""} onClick={() => setPane("play")} type="button">
          <IconCoin />
        </button>
        <button aria-label="Table" className={pane === "table" ? "is-on" : ""} onClick={() => setPane("table")} type="button">
          <IconTable />
        </button>
        <button aria-label="News" className={pane === "chat" ? "is-on" : ""} onClick={() => setPane("chat")} type="button">
          <IconChat />
        </button>
      </nav>
      {creating ? (
        <div className="pit-modal" onClick={() => setCreating(false)}>
          <div onClick={(event) => event.stopPropagation()}>
            <CreateRoomForm
              onCreated={(next) => {
                setCreating(false);
                router.push(`/rooms/${next}`);
              }}
            />
            <button className="nav-link mt-3" onClick={() => setCreating(false)} type="button">
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResultCard({
  result,
  playerId,
}: {
  result: NonNullable<PublicRound["result"]>;
  playerId: string;
}) {
  const yours = result.payouts.find((payout) => payout.playerId === playerId);
  const names = result.winners
    .map((id) => colorById(id).name)
    .join(" & ");

  if (result.kind === "empty") {
    return (
      <div className="result-card">
        No clicks that round. Pot stays empty.
      </div>
    );
  }

  if (result.kind === "push") {
    return (
      <div className="result-card">
        All colors tied. Everyone who clicked got their USDT back.
        {yours ? ` You received ${formatUsdt(yours.amount)} USDT.` : ""}
      </div>
    );
  }

  return (
    <div className="result-card">
      <strong>{names}</strong> had the most clicks and took the other colors’
      money. {formatUsdt(result.payoutPerWinningClick)} USDT per winning click.
      {yours
        ? ` You received ${formatUsdt(yours.amount)} USDT.`
        : playerId
          ? " You were not on the winning color."
          : ""}
    </div>
  );
}
