"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { PadRune } from "@/components/PadRune";
import { COLORS, colorById, type ColorId } from "@/lib/colors";
import { REVEAL_SECONDS } from "@/lib/config";
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

export function GameClient() {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const [busyColor, setBusyColor] = useState<ColorId | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [potPulse, setPotPulse] = useState(false);
  const skew = useRef(0);
  const lastPot = useRef(0);
  const burstId = useRef(0);

  const applyState = useCallback((next: GameState) => {
    skew.current = Date.now() - next.now;
    if (next.round.pot > lastPot.current) {
      setPotPulse(true);
      window.setTimeout(() => setPotPulse(false), 700);
    }
    lastPot.current = next.round.pot;
    setState(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      applyState(await readApi("/api/state"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load game");
    }
  }, [applyState]);

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

  const leader = useMemo(() => {
    if (!state) return [];
    const max = Math.max(...COLORS.map((color) => state.round.totals[color.id]));
    if (max <= 0) return [];
    return COLORS.filter((color) => state.round.totals[color.id] === max).map(
      (color) => color.id,
    );
  }, [state]);

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
    window.setTimeout(() => {
      setBursts((list) => list.filter((item) => item.id !== burst.id));
      setSparks((list) => list.filter((item) => item.id !== burst.id));
    }, 700);

    setBusyColor(colorId);
    setError("");
    try {
      applyState(
        await readApi("/api/click", {
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
        <p>Opening the arena…</p>
      </div>
    );
  }

  const { user, round } = state;
  const revealing = round.status === "revealing";
  const urgent = !revealing && remainingMs > 0 && remainingMs < 10_000;
  const canClick =
    Boolean(user?.emailVerified) &&
    !revealing &&
    (user?.balance ?? 0) >= round.clickPrice;
  const winner = round.result?.winners[0];
  const winnerColor = winner ? colorById(winner) : null;

  return (
    <div className="game-stage mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:py-8">
      {revealing && winnerColor ? (
        <div
          className="take-veil"
          style={
            {
              "--pad": winnerColor.hex,
              "--glow": winnerColor.glow,
            } as CSSProperties
          }
        >
          <PadRune id={winnerColor.id} />
          <p className="take-kicker">The pot is claimed</p>
          <p className="take-name">{winnerColor.name}</p>
        </div>
      ) : null}

      <section className={`arena ${revealing ? "is-revealing" : ""} ${urgent ? "is-urgent" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              {revealing ? "Winner lock" : `Round #${round.number} · live pot`}
            </p>
            <p className={`font-display pot-value text-3xl text-white ${potPulse ? "is-pulse" : ""}`}>
              {formatUsdt(round.pot)}{" "}
              <span className="text-base text-zinc-500">USDT</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              {revealing ? "Next round" : "Time left"}
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

      <div className="pad-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
        {COLORS.map((color, index) => {
          const clicks = round.totals[color.id];
          const yours = round.yourClicks[color.id];
          const share =
            round.totalClicks > 0 ? (clicks / round.totalClicks) * 100 : 0;
          const leading = leader.includes(color.id);
          const estimated = estimateIfWins(round, color.id);
          const taken =
            revealing && round.result?.winners.includes(color.id);
          const dimmed = revealing && !taken;
          return (
            <button
              key={color.id}
              type="button"
              disabled={!canClick}
              onClick={(event) => void onClick(color.id, event)}
              className={`color-pad ${busyColor === color.id ? "is-pressed" : ""} ${leading && !revealing ? "is-leading" : ""} ${taken ? "is-winner" : ""} ${dimmed ? "is-dimmed" : ""} ${sparks.some((item) => item.colorId === color.id) ? "is-spark" : ""}`}
              style={{
                "--pad": color.hex,
                "--ink": color.ink,
                "--glow": color.glow,
                animationDelay: `${index * 90}ms`,
              } as CSSProperties}
            >
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
              <div className="relative z-[1] flex items-start justify-between">
                <span className="font-display text-3xl">{color.name}</span>
                {leading && clicks > 0 ? (
                  <span className="lead-chip">Biggest</span>
                ) : null}
              </div>
              <div className="relative z-[1] mt-6 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-widest opacity-70">
                    Clicks
                  </p>
                  <p className="count-pop font-display text-6xl leading-none">
                    {clicks}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-widest opacity-70">
                    You
                  </p>
                  <p className="font-display text-3xl leading-none">{yours}</p>
                </div>
              </div>
              <div className="relative z-[1] mt-5 h-2 overflow-hidden rounded-full bg-black/25">
                <div
                  className="share-fill h-full"
                  style={{ width: `${share}%` }}
                />
              </div>
              <p className="relative z-[1] mt-3 text-sm opacity-80">
                {yours > 0
                  ? `If ${color.name} takes: ~${formatUsdt(estimated)} USDT`
                  : `Click to join · ${formatUsdt(round.clickPrice)} USDT`}
              </p>
            </button>
          );
        })}
      </div>
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
    .map((id) => COLORS.find((color) => color.id === id)?.name)
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
