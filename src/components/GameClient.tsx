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
  IconClose,
  IconCoin,
  IconHideLeft,
  IconLink,
  IconPause,
  IconPlay,
  IconPlus,
  IconShowLeft,
  IconShowRight,
  IconSlow,
  IconTable,
  IconUsers,
} from "@/components/Icons";
import { PadRune } from "@/components/PadRune";
import { PitHint } from "@/components/PitHint";
import { PlayerBoard } from "@/components/PlayerBoard";
import { RoomFeed } from "@/components/RoomFeed";
import { SearchDock } from "@/components/SearchDock";
import { SoundToggle } from "@/components/SoundToggle";
import { colorById, type ColorId } from "@/lib/colors";
import { REVEAL_SECONDS } from "@/lib/config";
import { shortHash } from "@/lib/fairness";
import { emitFx } from "@/lib/fx";
import { formatClock, formatUsdt, fromCents, rakeFromPot, toCents } from "@/lib/money";
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
  const distributable =
    losingPot - fromCents(rakeFromPot(toCents(losingPot), round.rakeBps ?? 0));
  return yourClicks * round.clickPrice + (yourClicks / colorClicks) * distributable;
}

export function GameClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [pane, setPane] = useState<"play" | "rooms" | "table" | "chat">("play");
  const [railOpen, setRailOpen] = useState(true);
  const [newsOpen, setNewsOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [roomName, setRoomName] = useState("");
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
          label: `${winner.name} takes · ${formatUsdt(next.round.pot)} USDT`,
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
        router.replace("/");
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
    const source = new EventSource(`/api/rooms/${slug}/live`);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as GameState & { closed?: boolean };
        if (data.closed) {
          router.replace("/");
          return;
        }
        if (data.room) applyState(data);
        setError("");
      } catch {
        /* ignore bad frames */
      }
    };
    source.onerror = () => undefined;
    const poll = window.setInterval(() => {
      void refresh();
    }, 12_000);
    const tick = window.setInterval(() => {
      setNow(Date.now() - skew.current);
    }, 100);
    return () => {
      source.close();
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [applyState, refresh, router, slug]);

  const remainingMs = useMemo(() => {
    if (!state) return 0;
    if (state.round.status === "revealing") {
      return (state.round.revealUntil ?? 0) - now;
    }
    return state.round.endsAt - now;
  }, [now, state]);

  useEffect(() => {
    if (!state || state.round.status !== "live" || state.room.paused) return;
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

  async function hostAct(body: Record<string, unknown>) {
    setError("");
    try {
      applyState(
        await readApi(`/api/rooms/${slug}/host`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Host action failed");
    }
  }

  if (!state) {
    return (
      <div className="pit-app">
        <div className="loader-stage">
          <div className="loader-ring" />
          <p>{error || "Opening the table…"}</p>
          {error ? (
            <Link className="underline" href="/">
              Back to rooms
            </Link>
          ) : null}
        </div>
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
  const urgent = !revealing && !room.paused && remainingMs > 0 && remainingMs < 10_000;
  const canClick =
    Boolean(user?.emailVerified) &&
    !room.paused &&
    !revealing &&
    (user?.balance ?? 0) >= round.clickPrice;
  const winner = round.result?.winners[0];
  const winnerColor = winner ? colorById(winner) : null;

  return (
    <div className="pit-app">
      <PitHint />
      <div className="pit-top">
        <SearchDock onPickRoom={(next) => router.push(`/rooms/${next}`)} />
        <button aria-label="Create room" className="pit-create" onClick={() => setCreating(true)} type="button">
          <IconPlus />
        </button>
        <SoundToggle />
        {user ? (
          <button
            aria-label="Copy invite"
            className="pit-ico"
            onClick={() => {
              const url = user.inviteCode
                ? `${window.location.origin}/rooms/${slug}?ref=${user.inviteCode}`
                : window.location.href;
              const text = user.inviteCode
                ? `Sign in with this link. If you sit, I get a slice of the house take only — not your bank.\n${url}`
                : url;
              void navigator.clipboard.writeText(text);
            }}
            type="button"
          >
            <IconLink />
          </button>
        ) : null}
        {room.host ? (
          <>
            <button
              aria-label={room.paused ? "Resume table" : "Pause table"}
              className="pit-ico"
              onClick={() => {
                void hostAct({ action: room.paused ? "resume" : "pause" });
              }}
              type="button"
            >
              {room.paused ? <IconPlay /> : <IconPause />}
            </button>
            <button
              aria-label={room.slowMode ? "Normal chat" : "Slow chat"}
              className={`pit-ico ${room.slowMode ? "is-on" : ""}`}
              onClick={() => {
                void hostAct({ action: "slow", slow: !room.slowMode });
              }}
              type="button"
            >
              <IconSlow />
            </button>
            <button
              aria-label="Close table"
              className="pit-ico"
              onClick={() => {
                void (async () => {
                  const response = await fetch(`/api/rooms/${slug}/host`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "close" }),
                  });
                  if (response.ok) router.replace("/");
                })();
              }}
              type="button"
            >
              <IconClose />
            </button>
          </>
        ) : null}
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
                  {item.paused ? " · paused" : ""}
                  {item.closesAt ? ` · ${formatClock(item.closesAt - now)}` : ""}
                </span>
              </button>
            ))}
          </div>
        </aside>
        <div className={`pit-main ${pane === "play" ? "is-open" : ""}`}>
    <div className="game-stage">
      <div className="room-back">
        {room.host && renaming ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                await hostAct({ action: "rename", name: roomName });
                setRenaming(false);
              })();
            }}
          >
            <input
              autoFocus
              className="field"
              maxLength={28}
              onChange={(event) => setRoomName(event.target.value)}
              value={roomName}
            />
            <button className="chip-btn" type="submit">
              Save
            </button>
          </form>
        ) : (
          <span
            className={room.host ? "cursor-pointer" : undefined}
            onClick={() => {
              if (!room.host) return;
              setRoomName(room.name);
              setRenaming(true);
            }}
            title={room.host ? "Rename table" : undefined}
          >
            {room.name}
            {room.paused ? " · paused" : ""}
          </span>
        )}
        <span>
          {room.buttonCount} coins · {formatUsdt(room.clickPrice)} USDT · {room.roundSeconds}s
          {liveLeft != null ? ` · table ${formatClock(liveLeft)}` : ""}
          {room.slowMode ? " · slow chat" : ""}
          {" · "}
          <Link href={`/fairness?slug=${slug}`}>Fairness</Link>
        </span>
      </div>
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
          <span className="take-corona" />
          {Array.from({ length: 10 }, (_, index) => (
            <span className="take-spark" key={index} style={{ "--i": index } as CSSProperties} />
          ))}
          <PadRune id={winnerColor.id} />
          <p className="take-kicker">Takes the pot</p>
          <p className="take-name">{winnerColor.name}</p>
          {round.pot > 0 ? (
            <p className="take-pot">{formatUsdt(round.pot)} USDT</p>
          ) : null}
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
              {room.paused ? "Paused" : revealing ? "Next round" : fog ? "Fog · time left" : "Time left"}
            </p>
            <p className={`font-display clock-value text-3xl tabular-nums text-white ${urgent ? "is-urgent" : ""}`}>
              {room.paused ? "Hold" : formatClock(remainingMs)}
            </p>
            {round.seedCommit ? (
              <p className="mt-1 font-mono text-[10px] text-zinc-500">
                {revealing && round.serverSeed ? "Seed open" : "Commit"}{" "}
                {shortHash(revealing && round.serverSeed ? round.serverSeed : round.seedCommit)}
              </p>
            ) : null}
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
        <p className="pit-rule">
          Same price every coin. Biggest color takes the rest.
          {room.fogSeconds
            ? ` Last ${room.fogSeconds}s, public counts go dark.`
            : ""}
        </p>
        {!user ? (
          <p className="pit-cta">
            <Link className="chip-btn" href="/signin">
              Sign in to sit
            </Link>
            <span>Watch the round live either way.</span>
          </p>
        ) : !user.emailVerified ? (
          <p className="pit-cta">
            <Link className="chip-btn" href="/signin">
              Sign in with Google
            </Link>
            <span>Then you can click colors.</span>
          </p>
        ) : user.balance < round.clickPrice ? (
          <p className="pit-cta">
            <Link className="chip-btn" href="/invest">
              Add USDT to sit
            </Link>
            <span>Bank is below this table’s click price.</span>
          </p>
        ) : null}
      </section>

      {revealing && round.result ? (
        <ResultCard
          playerId={user?.id ?? ""}
          result={round.result}
          round={round}
          roomName={room.name}
          sharePath={
            user?.inviteCode
              ? `/rooms/${slug}?ref=${user.inviteCode}`
              : `/rooms/${slug}`
          }
          canOpenFog={Boolean(user?.emailVerified) && !user?.blocked}
          inviteCode={user?.inviteCode ?? ""}
          buttonCount={room.buttonCount}
          clickPrice={round.clickPrice}
          roundSeconds={room.roundSeconds}
          wash={winnerColor?.hex}
        />
      ) : null}

      {error ? (
        <p className="error-toast rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}{" "}
          {error.toLowerCase().includes("invest") ? (
            <Link className="underline" href="/invest">
              Add USDT
            </Link>
          ) : null}
          {error.toLowerCase().includes("google") || error.toLowerCase().includes("verify") ? (
            <Link className="underline" href="/signin">
              Sign in
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
                <span className="pad-grain" />
                <span className="coin-core" />
                <span className="pad-sheen" />
                <span className="pad-glint" />
                <span className="pad-orbit" />
                <span className="pad-rays" />
                <span className="pad-twirl" />
                <PadRune id={color.id} />
                {bursts
                  .filter((burst) => burst.color === color.hex)
                  .map((burst) => (
                    <span key={burst.id}>
                      <span
                        className="pad-ripple"
                        style={{ left: burst.x, top: burst.y }}
                      />
                      <span
                        className="pad-burst"
                        style={{ left: burst.x, top: burst.y }}
                      />
                      <span
                        className="pad-spark"
                        style={{ left: burst.x, top: burst.y }}
                      />
                    </span>
                  ))}
                {taken ? (
                  <span className="lead-chip is-take">Takes</span>
                ) : leading && clicks > 0 ? (
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
          <PlayerBoard
            buttonIds={round.buttonIds}
            fog={fog}
            host={room.host}
            onMute={(userId) => {
              void fetch(`/api/rooms/${slug}/host`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "mute", userId }),
              });
            }}
            seats={seats}
          />
        </div>
        </div>
        <div className={`pit-chat ${pane === "chat" ? "is-open" : ""} ${newsOpen ? "" : "is-slim"}`}>
          <RoomFeed
            feed={feed}
            muted={room.muted}
            onHide={() => setNewsOpen(false)}
            onState={applyState}
            slug={slug}
            user={user}
          />
          <button
            aria-label="Show talk"
            className="pit-ico pit-slim-open"
            onClick={() => setNewsOpen(true)}
            type="button"
          >
            <IconShowRight />
          </button>
        </div>
        <div className={`pit-sheet ${pane === "table" ? "is-open" : ""}`}>
          <PlayerBoard
            buttonIds={round.buttonIds}
            fog={fog}
            host={room.host}
            onMute={(userId) => {
              void fetch(`/api/rooms/${slug}/host`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "mute", userId }),
              });
            }}
            seats={seats}
          />
        </div>
      </div>
      <nav className="pit-tabs">
        <button aria-label="Rooms" className={pane === "rooms" ? "is-on" : ""} onClick={() => setPane("rooms")} type="button">
          <IconUsers />
          <span>Rooms</span>
        </button>
        <button aria-label="Play" className={pane === "play" ? "is-on" : ""} onClick={() => setPane("play")} type="button">
          <IconCoin />
          <span>Play</span>
        </button>
        <button aria-label="Table" className={pane === "table" ? "is-on" : ""} onClick={() => setPane("table")} type="button">
          <IconTable />
          <span>Table</span>
        </button>
        <button aria-label="Talk" className={pane === "chat" ? "is-on" : ""} onClick={() => setPane("chat")} type="button">
          <IconChat />
          <span>Talk</span>
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

function CountUsdt({ value }: { value: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      setShown(value * (1 - (1 - t) ** 3));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <>{formatUsdt(shown)}</>;
}

function takeLine(names: string, take: number, roomName: string) {
  return `${names} took ${formatUsdt(take)} USDT on ${roomName} — sit the next round`;
}

function ShareTake({
  path,
  line,
  fogName,
  canOpenFog,
  inviteCode,
  buttonCount,
  clickPrice,
  roundSeconds,
}: {
  path: string;
  line: string;
  fogName: string;
  canOpenFog: boolean;
  inviteCode: string;
  buttonCount: number;
  clickPrice: number;
  roundSeconds: number;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared">("idle");
  const [fogBusy, setFogBusy] = useState(false);
  const [fogError, setFogError] = useState("");

  async function share() {
    const url = `${window.location.origin}${path}`;
    const text = `${line}.\n${url}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Huepot", text: line, url });
        setStatus("shared");
      } else {
        await navigator.clipboard.writeText(text);
        setStatus("copied");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(text);
        setStatus("copied");
      } catch {
        /* ignore */
      }
    }
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  async function openFog() {
    setFogBusy(true);
    setFogError("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fogName,
          buttonCount,
          clickPrice,
          roundSeconds,
          liveMinutes: 30,
          fog: true,
        }),
      });
      const data = (await response.json()) as GameState & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not open Fog");
      const slug = data.room.slug;
      const next = inviteCode ? `/rooms/${slug}?ref=${inviteCode}` : `/rooms/${slug}`;
      const url = `${window.location.origin}${next}`;
      try {
        await navigator.clipboard.writeText(`${line}. Fog is open 30 minutes.\n${url}`);
      } catch {
        /* ignore */
      }
      window.location.assign(`/rooms/${slug}`);
    } catch (err) {
      setFogError(err instanceof Error ? err.message : "Could not open Fog");
      setFogBusy(false);
    }
  }

  const label = status === "copied" ? "Copied" : status === "shared" ? "Shared" : "Share this take";

  return (
    <div className="take-share">
      <p className="take-share-line">{line}.</p>
      <p>
        <button className="take-share-btn" onClick={() => void share()} type="button">
          {label}
        </button>
        {" · "}
        {canOpenFog ? (
          <button className="take-share-btn" disabled={fogBusy} onClick={() => void openFog()} type="button">
            {fogBusy ? "Opening Fog…" : "Open a 30-min Fog table"}
          </button>
        ) : (
          <Link href="/signin">Sign in to open Fog</Link>
        )}
      </p>
      {fogError ? <p className="mt-2 text-sm text-red-800">{fogError}</p> : null}
    </div>
  );
}

function ResultCard({
  result,
  round,
  playerId,
  roomName,
  sharePath,
  canOpenFog,
  inviteCode,
  buttonCount,
  clickPrice,
  roundSeconds,
  wash,
}: {
  result: NonNullable<PublicRound["result"]>;
  round: PublicRound;
  playerId: string;
  roomName: string;
  sharePath: string;
  canOpenFog: boolean;
  inviteCode: string;
  buttonCount: number;
  clickPrice: number;
  roundSeconds: number;
  wash?: string;
}) {
  const yours = result.payouts.find((payout) => payout.playerId === playerId);
  const names = result.winners
    .map((id) => colorById(id).name)
    .join(" & ");
  const sheet = (
    <p className="mt-2 text-xs text-zinc-500">
      <Link className="underline" href={`/fairness/${round.id}`}>
        Check this round
      </Link>
      {round.fairHash ? ` · ${shortHash(round.fairHash)}` : ""}
    </p>
  );
  const cardStyle = wash
    ? ({ "--pad": wash } as CSSProperties)
    : undefined;

  if (result.kind === "void") {
    return (
      <div className="result-card" style={cardStyle}>
        Staff voided this round. Everyone who clicked got their USDT back.
        {yours ? ` You received ${formatUsdt(yours.amount)} USDT.` : ""}
        {sheet}
      </div>
    );
  }

  if (result.kind === "empty") {
    return (
      <div className="result-card">
        No clicks that round. Pot stays empty.
        {sheet}
      </div>
    );
  }

  if (result.kind === "push") {
    return (
      <div className="result-card" style={cardStyle}>
        All colors tied. Everyone who clicked got their USDT back.
        {yours ? ` You received ${formatUsdt(yours.amount)} USDT.` : ""}
        {sheet}
      </div>
    );
  }

  return (
    <div className="result-card" style={cardStyle}>
      <strong>{names}</strong> had the most clicks and took the other colors’
      money.
      {result.rake
        ? ` House took ${formatUsdt(result.rake)} USDT. `
        : " "}
      {formatUsdt(result.payoutPerWinningClick)} USDT per winning click.
      {yours ? (
        <span className="result-payout">
          You take <CountUsdt value={yours.amount} /> USDT
        </span>
      ) : playerId ? (
        " You were not on the winning color."
      ) : (
        ""
      )}
      {sheet}
      <ShareTake
        buttonCount={buttonCount}
        canOpenFog={canOpenFog}
        clickPrice={clickPrice}
        fogName={`${names.split(" & ")[0]} Fog`.slice(0, 28)}
        inviteCode={inviteCode}
        line={takeLine(
          names,
          result.payouts.reduce((sum, payout) => sum + payout.amount, 0),
          roomName,
        )}
        path={sharePath}
        roundSeconds={roundSeconds}
      />
    </div>
  );
}
