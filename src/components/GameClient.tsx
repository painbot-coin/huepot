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
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { PitLoader } from "@/components/PitLoader";
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
import { ClickGraph } from "@/components/ClickGraph";
import { RoomMark } from "@/components/RoomMark";
import { AfterTakeButton } from "@/components/AfterTakeButton";
import { PitHint } from "@/components/PitHint";
import { ShareTake } from "@/components/ShareTake";
import { PlayerBoard } from "@/components/PlayerBoard";
import { RoomFeed } from "@/components/RoomFeed";
import { SearchDock } from "@/components/SearchDock";
import { SoundToggle } from "@/components/SoundToggle";
import { colorById, type ColorId } from "@/lib/colors";
import { REVEAL_SECONDS } from "@/lib/config";
import { shortHash } from "@/lib/fairness";
import { publishBank } from "@/lib/bank-sync";
import { emitFx, emitPads } from "@/lib/fx";
import { hallClass, hallFor } from "@/lib/hall";
import { classicHourClock } from "@/lib/classic-hour";
import { cupSendsToFog, hourSendsToClassic, hourSendsToNight } from "@/lib/hour-door";
import { fogCupClock } from "@/lib/fog-cup";
import { nightHourClock } from "@/lib/night-hour";
import { inviteText } from "@/lib/invite-copy";
import { formatClock, formatUsdt, fromCents, rakeFromPot, toCents } from "@/lib/money";
import { formatTakeLine, withSitWhen } from "@/lib/take-copy";
import type { GameState, PublicRound } from "@/lib/types";

const CreateRoomForm = dynamic(
  () => import("@/components/CreateRoomForm").then((mod) => mod.CreateRoomForm),
  { loading: () => <PitLoader label="Opening create…" /> },
);

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
  const [potPulse, setPotPulse] = useState(false);
  const skew = useRef(0);
  const lastPot = useRef(0);
  const lastStatus = useRef("");
  const lastRound = useRef(0);
  const urgentSent = useRef(false);
  const fogSent = useRef(false);

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
    if (typeof next.user?.balance === "number") {
      publishBank(next.user.balance, next.user.bonus);
    }
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
      emitFx({ kind: "urgent", color: "#ff355e", label: "Last seconds" });
    }
  }, [remainingMs, state]);

  useEffect(() => {
    if (!state?.room.paused) return;
    urgentSent.current = false;
    emitFx({ kind: "round" });
  }, [state?.room.paused]);

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

  useEffect(() => {
    if (!state) return;
    const ids = state.round.buttonIds;
    const total = state.round.totalClicks;
    const revealingNow = state.round.status === "revealing";
    emitPads({
      fog: boardFog,
      pads: ids.map((id) => {
        const clicks = state.round.totals[id] ?? 0;
        const share = boardFog || total <= 0 ? 0 : clicks / total;
        return {
          color: colorById(id).hex,
          leading: !boardFog && leader.includes(id),
          spark: false,
          share,
          winner: Boolean(revealingNow && state.round.result?.winners.includes(id)),
        };
      }),
    });
  }, [boardFog, leader, state]);

  function punchPad(colorId: ColorId) {
    emitFx({ kind: "click", color: colorById(colorId).hex });
  }

  function onPadDown(colorId: ColorId, event: PointerEvent<HTMLButtonElement>) {
    if (!canClick) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* capture is optional */
    }
    punchPad(colorId);
    setBusyColor(colorId);
    window.setTimeout(() => {
      setBusyColor((current) => (current === colorId ? null : current));
    }, 180);
    setError("");
    void readApi(`/api/rooms/${slug}/click`, {
      method: "POST",
      body: JSON.stringify({ colorId }),
    })
      .then((next) => applyState(next))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Click failed");
        void refresh();
      });
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
  const hour = state.classicHour;
  const night = state.nightHour;
  const cup = state.fogCup;
  const table = round.buttonIds.map((id) => colorById(id));
  const liveLeft = room.closesAt ? room.closesAt - now : null;
  const revealing = round.status === "revealing";
  const fog = boardFog;
  const urgent = !revealing && !room.paused && remainingMs > 0 && remainingMs < 10_000;
  const canClick =
    Boolean(user?.emailVerified) &&
    !user?.blocked &&
    !room.paused &&
    !revealing &&
    (user?.balance ?? 0) + (user?.bonus ?? 0) >= round.clickPrice;
  const winner = round.result?.winners[0];
  const winnerColor = winner ? colorById(winner) : null;
  const hall = hallFor(slug);
  // Most rounds on a quiet table settle with nobody clicking. That is not a take.
  const tookPot = Boolean(revealing && winnerColor);
  const emptyRound = revealing && round.result?.kind === "empty";
  const youSat = Object.values(round.yourClicks ?? {}).some((n) => n > 0);

  return (
    <div
      className={`pit-app ${hallClass(slug)} ${room.paused ? "is-paused" : revealing ? (tookPot ? "is-take" : "is-closed") : "is-calm"} ${urgent ? "is-urgent" : ""} ${fog ? "is-fog" : ""} ${slug === "classic" && hour?.live ? "is-hour" : ""} ${slug === "night" && night?.live ? "is-hour" : ""} ${slug === "fog" && cup?.live ? "is-cup" : ""}`}
      style={
        {
          ...(hall ? { "--hall": hall.material } : {}),
          ...(revealing && winnerColor ? { "--take": winnerColor.hex } : {}),
        } as CSSProperties
      }
    >
      <PitHint />
      <div className="pit-top">
        <SearchDock onPickRoom={(next) => router.push(`/rooms/${next}`)} />
        <button aria-label="Raise a table" className="pit-create" onClick={() => setCreating(true)} type="button">
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
                ? inviteText(url, {
                    hour: slug === "fog" ? null : hour?.hour,
                    night: slug === "fog" ? null : night?.hour,
                    cup,
                  })
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
            <span className="pit-rail-title">Rooms</span>
            <button aria-label="Raise a table" className="pit-ico" onClick={() => setCreating(true)} type="button">
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
                className={`pit-room ${hallClass(item.slug)} ${item.slug === slug ? "is-on" : ""}`}
                key={item.slug}
                onClick={() => {
                  router.push(`/rooms/${item.slug}`);
                  setPane("play");
                }}
                type="button"
              >
                <RoomMark className="room-mark is-rail" fog={Boolean(item.fogSeconds)} slug={item.slug} />
                <span className="pit-room-copy">
                  <strong>
                    {item.name}
                    <em className={`pit-kind is-${item.kind}`} title={item.kind === "basic" ? "No fee" : "Custom"} />
                  </strong>
                  <span>
                    {item.buttonCount} · {formatUsdt(item.clickPrice)} · {formatUsdt(item.pot)}
                    {item.paused ? " · paused" : ""}
                    {item.closesAt ? ` · ${formatClock(item.closesAt - now)}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>
        <div className={`pit-main ${pane === "play" ? "is-open" : ""}`}>
    <div className="game-stage">
      <div className="room-back">
        <RoomMark className="room-mark is-table" fog={Boolean(room.fogSeconds)} slug={slug} />
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
            {slug === "classic" && hour
              ? hour.live
                ? " · hour is on"
                : hourSendsToClassic(hour, now)
                  ? " · hour soon"
                  : ` · hour ${classicHourClock(hour.hour)}`
              : slug === "night" && night
                ? night.live
                  ? " · hour is on"
                  : hourSendsToNight(night, now)
                    ? " · hour soon"
                    : ` · hour ${nightHourClock(night.hour)}`
                : slug === "fog" && cup
                  ? cup.live
                    ? " · cup is on"
                    : cupSendsToFog(cup, now)
                      ? " · cup soon"
                      : ` · cup ${fogCupClock(cup.weekday, cup.hour)}`
                  : ""}
          </span>
        )}
        <span>
          {room.buttonCount} coins · {formatUsdt(room.clickPrice)} USDT · {room.roundSeconds}s
          {liveLeft != null ? ` · table ${formatClock(liveLeft)}` : ""}
          {room.slowMode ? " · slow chat" : ""}
          {" · "}
          <Link href={`/fairness?slug=${slug}`}>Ledger</Link>
        </span>
      </div>
      <section className={`arena ${revealing ? "is-revealing" : ""} ${urgent ? "is-urgent" : ""} ${fog ? "is-fog" : ""}`}>
        {revealing && winnerColor ? (
          <div
            className="take-wash"
            style={
              {
                "--pad": winnerColor.hex,
                "--glow": winnerColor.glow,
              } as CSSProperties
            }
          />
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              {revealing
                ? tookPot
                  ? "The take"
                  : "Round closed"
                : `${room.name} · round #${round.number}`}
            </p>
            <p className={`font-display pot-value text-3xl text-white ${potPulse ? "is-pulse" : ""}`}>
              {formatUsdt(round.pot)}{" "}
              <span className="text-base text-zinc-500">USDT</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              {room.paused
                ? "Paused"
                : revealing
                  ? "Next round"
                  : fog
                    ? "Fog"
                    : "Time"}
            </p>
            <p className="mt-1 font-mono text-sm tabular-nums text-zinc-200">
              {formatClock(Math.max(0, remainingMs))}
            </p>
            {round.seedCommit ? (
              <p className="mt-1 font-mono text-[10px] text-zinc-500">
                {revealing && round.serverSeed ? "Seed open" : "Commit"}{" "}
                {shortHash(revealing && round.serverSeed ? round.serverSeed : round.seedCommit)}
              </p>
            ) : null}
          </div>
        </div>
        <ClickGraph
          roundId={round.id}
          buttonIds={round.buttonIds}
          seats={seats}
          totals={round.totals}
          yourClicks={round.yourClicks}
          clickPrice={round.clickPrice}
          estimates={Object.fromEntries(
            table.map((color) => [color.id, fog ? 0 : estimateIfWins(round, color.id)]),
          ) as Record<ColorId, number>}
          fog={fog}
          remainingMs={remainingMs}
          durationMs={
            revealing
              ? REVEAL_SECONDS * 1000
              : Math.max(1, round.endsAt - round.startedAt)
          }
          paused={room.paused}
          revealing={revealing}
          urgent={urgent}
          canClick={canClick}
          busyColor={busyColor}
          leader={leader}
          winners={round.result?.winners ?? []}
          onPadDown={onPadDown}
        />
        {hall ? <p className="pit-enter">{hall.enter}</p> : null}
        <p className="pit-rule">
          Same price every coin. Biggest color takes the rest.
          {room.fogSeconds
            ? ` Last ${room.fogSeconds}s, public counts go dark.`
            : ""}
        </p>
        <p className="pit-mood">
          {room.paused
            ? "The host paused the pit."
            : revealing
              ? tookPot
                ? "The take."
                : emptyRound
                  ? "Nobody clicked. The board comes back."
                  : "The round closed."
              : fog && urgent
                ? cup?.live
                  ? "Fog cup. Last seconds."
                  : "Fog. Last seconds."
                : fog
                  ? cup?.live
                    ? "Fog cup. The board is dark."
                    : "The board is dark."
                  : urgent
                    ? "Last seconds."
                    : slug === "classic" && hour?.live
                      ? hall?.hour ?? "Classic hour is on."
                      : slug === "classic" && hour && hourSendsToClassic(hour, now)
                        ? "Classic hour soon."
                      : slug === "night" && night?.live
                        ? hall?.hour ?? "Night hour is on."
                        : slug === "night" && night && hourSendsToNight(night, now)
                          ? "Night hour soon."
                        : slug === "fog" && cup?.live
                          ? hall?.cup ?? "Fog cup is on."
                          : hall?.calm ?? "The pit is open."}
        </p>
        {tookPot && user && youSat && !user.blocked ? (
          <p className="pit-cta">
            <AfterTakeButton inviteCode={user.inviteCode} />
            <span>30 minutes of Fog. Company hears.</span>
          </p>
        ) : !user ? (
          <p className="pit-cta">
            <Link className="chip-btn" href="/signin">
              Sign in to sit
            </Link>
            <span>Watch the round live either way.</span>
          </p>
        ) : !user.emailVerified ? (
          <p className="pit-cta">
            <Link className="chip-btn" href="/signin">
              Cross the gate
            </Link>
            <span>Then you can click colors.</span>
          </p>
        ) : user.blocked ? (
          <p className="pit-cta">
            <Link className="chip-btn" href="/account">
              Seat limits
            </Link>
            <span>{user.blockMessage || "Play is paused on this account."}</span>
          </p>
        ) : (user.balance ?? 0) + (user.bonus ?? 0) < round.clickPrice ? (
          <p className="pit-cta">
            {(user.bonus ?? 0) > 0 ? (
              <Link className="chip-btn" href="/rooms/classic">
                Sit Classic with the chip
              </Link>
            ) : (
              <Link className="chip-btn" href="/invest">
                Add USDT to sit
              </Link>
            )}
            <span>
              {(user.bonus ?? 0) > 0
                ? "Sit chips do not cover this table."
                : "Not enough to sit. Add USDT or wait for tomorrow's sit chip."}
            </span>
          </p>
        ) : room.paused ? (
          <p className="pit-cta">
            <span>The host paused this table.</span>
          </p>
        ) : null}
      </section>

      {error ? (
        <p className="error-toast">
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

      {revealing ? (
        <aside className="take-notice">
          {winnerColor ? (
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
              <p className="take-kicker">The take</p>
              <p className="take-name">{winnerColor.name}</p>
              {round.pot > 0 ? (
                <p className="take-pot">{formatUsdt(round.pot)} USDT</p>
              ) : null}
            </div>
          ) : null}
          {round.result ? (
            <ResultCard
              playerId={user?.id ?? ""}
              result={round.result}
              round={round}
              roomName={room.name}
              sharePath={
                user?.inviteCode
                  ? `/take/${round.id}?ref=${user.inviteCode}`
                  : `/take/${round.id}`
              }
              canOpenFog={Boolean(user?.emailVerified) && !user?.blocked}
              inviteCode={user?.inviteCode ?? ""}
              slug={slug}
              hour={hour?.hour}
              night={night?.hour}
              cup={cup}
              buttonCount={room.buttonCount}
              clickPrice={round.clickPrice}
              roundSeconds={room.roundSeconds}
              sitWhen={
                night?.live
                  ? `Night hour ${nightHourClock(night.hour)}`
                  : cup
                    ? `Fog cup ${fogCupClock(cup.weekday, cup.hour)}`
                    : hour
                      ? `Classic hour ${classicHourClock(hour.hour)}`
                      : ""
              }
              wash={winnerColor?.hex}
            />
          ) : null}
        </aside>
      ) : null}
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
      {creating
        ? createPortal(
            <div
              aria-modal="true"
              className="pit-modal"
              onClick={() => setCreating(false)}
              role="dialog"
            >
              <div className="pit-modal-card" onClick={(event) => event.stopPropagation()}>
                <button
                  aria-label="Close"
                  className="pit-modal-x"
                  onClick={() => setCreating(false)}
                  type="button"
                >
                  <IconClose />
                </button>
                <CreateRoomForm
                  onCreated={(next) => {
                    setCreating(false);
                    router.push(`/rooms/${next}`);
                  }}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
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

function takeLine(names: string, take: number, roomName: string, when?: string) {
  return withSitWhen(formatTakeLine(names, take, roomName), when);
}

function ResultCard({
  result,
  round,
  playerId,
  roomName,
  sharePath,
  canOpenFog,
  inviteCode,
  slug,
  hour,
  night,
  cup,
  buttonCount,
  clickPrice,
  roundSeconds,
  sitWhen,
  wash,
}: {
  result: NonNullable<PublicRound["result"]>;
  round: PublicRound;
  playerId: string;
  roomName: string;
  sharePath: string;
  canOpenFog: boolean;
  inviteCode: string;
  slug: string;
  hour?: number | null;
  night?: number | null;
  cup?: { weekday: number; hour: number } | null;
  buttonCount: number;
  clickPrice: number;
  roundSeconds: number;
  sitWhen?: string;
  wash?: string;
}) {
  const yours = result.payouts.find((payout) => payout.playerId === playerId);
  const names = result.winners
    .map((id) => colorById(id).name)
    .join(" & ");
  const sheet = (
    <p className="mt-2 text-xs text-zinc-500">
      <Link className="underline" href={`/fairness/${round.id}`}>
        Open the ledger
      </Link>
      {round.fairHash ? ` · ${shortHash(round.fairHash)}` : ""}
    </p>
  );
  const cardStyle = wash
    ? ({ "--pad": wash } as CSSProperties)
    : undefined;

  if (result.kind === "void") {
    return (
      <div className="result-card is-quiet">
        <p className="hall-kicker">The rite</p>
        Staff voided this round. Everyone who clicked got their USDT back.
        {yours ? ` You received ${formatUsdt(yours.amount)} USDT.` : ""}
        {sheet}
      </div>
    );
  }

  if (result.kind === "empty") {
    // No ledger link: a round nobody clicked is not written to the book,
    // because there is no bet or payout in it to check.
    return (
      <div className="result-card is-quiet">
        <p className="hall-kicker">The round</p>
        Nobody clicked that round. The pot stays empty.
      </div>
    );
  }

  if (result.kind === "push") {
    return (
      <div className="result-card" style={cardStyle}>
        <p className="hall-kicker">The rite</p>
        All colors tied. Everyone who clicked got their USDT back.
        {yours ? ` You received ${formatUsdt(yours.amount)} USDT.` : ""}
        {sheet}
      </div>
    );
  }

  return (
    <div className="result-card" style={cardStyle}>
      <p className="hall-kicker">The rite</p>
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
        slug={slug}
        hour={hour}
        night={night}
        cup={cup}
        line={takeLine(
          names,
          result.payouts.reduce((sum, payout) => sum + payout.amount, 0),
          roomName,
          sitWhen,
        )}
        path={sharePath}
        roundSeconds={roundSeconds}
      />
    </div>
  );
}
