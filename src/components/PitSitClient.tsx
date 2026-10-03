"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { HouseButton } from "@/components/HouseUi";
import { colorsForCount } from "@/lib/colors";
import {
  PIT_FEATURES,
  PIT_RULES,
  emptyCounts,
  freshPitSeed,
  makePitRng,
  pickColor,
  readPick,
  settleLine,
  totalsOf,
  winnersOf,
  type PitKind,
} from "@/lib/pit-ai";

type Mode = "sit" | "watch";
type Part = { name: string; value: number; weight: number; pull: number };

type Sit = {
  remaining: number;
  you: number[];
  west: number[];
  east: number[];
  seen: number[];
  pick: number;
  scores: number[];
  parts: Part[];
  over: string;
};

const HOLD_MS = 140;
const ARR_MS = 90;

function blank(coins: number, seconds: number): Sit {
  return {
    remaining: seconds,
    you: emptyCounts(coins),
    west: emptyCounts(coins),
    east: emptyCounts(coins),
    seen: emptyCounts(coins),
    pick: 0,
    scores: emptyCounts(coins),
    parts: [],
    over: "",
  };
}

export function PitSitClient({
  kind,
  name,
  version,
  weights,
}: {
  kind: PitKind;
  name: string;
  version: string;
  weights: number[];
}) {
  const rules = PIT_RULES[kind];
  const hues = useMemo(() => colorsForCount(rules.coins), [rules.coins]);
  const names = useMemo(() => hues.map((hue) => hue.name), [hues]);
  const [mode, setMode] = useState<Mode>("sit");
  const [sit, setSit] = useState(() => blank(rules.coins, rules.seconds));
  const [sits, setSits] = useState(0);
  const [takes, setTakes] = useState(0);
  const [deal, setDeal] = useState(0);
  const live = useRef(sit);
  const modeRef = useRef(mode);
  const rng = useRef(makePitRng(freshPitSeed()));
  const holdTimer = useRef(0);
  const arrTimer = useRef(0);

  const paint = (next: Sit) => {
    live.current = next;
    setSit(next);
  };

  const reset = useCallback(() => {
    rng.current = makePitRng(freshPitSeed());
    const next = blank(rules.coins, rules.seconds);
    paint(next);
    setDeal((n) => n + 1);
  }, [rules.coins, rules.seconds]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    reset();
  }, [kind, weights, reset]);

  const darkOf = (remaining: number) => rules.fogSeconds > 0 && remaining > 0 && remaining <= rules.fogSeconds;

  const houseClick = (now: Sit, side: "west" | "east") => {
    const dark = darkOf(now.remaining);
    const board = dark ? now.seen : totalsOf([now.you, now.west, now.east]);
    const choice = pickColor(board, now.remaining, rules.seconds, dark, weights, rng.current);
    const nextSide = [...now[side]];
    nextSide[choice.action] += 1;
    return {
      ...now,
      [side]: nextSide,
      seen: dark ? now.seen : totalsOf([now.you, side === "west" ? nextSide : now.west, side === "east" ? nextSide : now.east]),
      pick: choice.action,
      scores: choice.scores,
      parts: readPick(board, now.remaining, rules.seconds, dark, weights, choice.action).parts,
    } as Sit;
  };

  const finish = (now: Sit) => {
    const counts = totalsOf([now.you, now.west, now.east]);
    const watch = modeRef.current === "watch";
    const over = settleLine(counts, now.you, watch ? now.east : now.west, names, watch);
    setSits((n) => n + 1);
    if (winnersOf(counts).length) setTakes((n) => n + 1);
    return { ...now, remaining: 0, over, seen: counts };
  };

  const clickYou = useCallback(
    (action: number) => {
      const now = live.current;
      if (now.over || now.remaining <= 0 || modeRef.current !== "sit") return;
      const dark = darkOf(now.remaining);
      const nextYou = [...now.you];
      nextYou[action] += 1;
      const counts = totalsOf([nextYou, now.west, now.east]);
      const board = dark ? now.seen : counts;
      const choice = pickColor(board, now.remaining, rules.seconds, dark, weights);
      paint({
        ...now,
        you: nextYou,
        seen: dark ? now.seen : counts,
        pick: action,
        scores: choice.scores,
        parts: readPick(board, now.remaining, rules.seconds, dark, weights, action).parts,
      });
    },
    [rules.seconds, weights],
  );

  const stopHold = useCallback(() => {
    window.clearTimeout(holdTimer.current);
    window.clearInterval(arrTimer.current);
    holdTimer.current = 0;
    arrTimer.current = 0;
  }, []);

  const startHold = useCallback(
    (action: number) => {
      stopHold();
      clickYou(action);
      holdTimer.current = window.setTimeout(() => {
        arrTimer.current = window.setInterval(() => clickYou(action), ARR_MS);
      }, HOLD_MS);
    },
    [clickYou, stopHold],
  );

  useEffect(() => {
    const tick = rules.seconds <= 15 ? 140 : 180;
    const id = window.setInterval(() => {
      const now = live.current;
      if (now.over) return;
      const nextLeft = now.remaining - 1;
      let next = { ...now, remaining: Math.max(0, nextLeft) };
      const dark = darkOf(nextLeft);
      if (!dark) next.seen = totalsOf([next.you, next.west, next.east]);
      next = houseClick(next, "west");
      if (modeRef.current === "watch") next = houseClick(next, "east");
      else next = houseClick(next, "west");
      if (nextLeft <= 0) next = finish(next);
      paint(next);
    }, tick);
    return () => window.clearInterval(id);
  }, [deal, names, rules.fogSeconds, rules.seconds, weights]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || modeRef.current !== "sit") return;
      const n = Number(event.key);
      if (n >= 1 && n <= hues.length) {
        event.preventDefault();
        startHold(n - 1);
      }
    };
    const up = () => stopHold();
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", up);
      stopHold();
    };
  }, [hues.length, startHold, stopHold]);

  const dark = darkOf(sit.remaining);
  const counts = totalsOf([sit.you, sit.west, sit.east]);
  const shown = dark ? sit.seen : counts;
  const maxScore = Math.max(...sit.scores.map((n) => Math.abs(n)), 0.001);
  const maxCount = Math.max(...shown, 1);
  const watch = mode === "watch";

  function holdPad(action: number) {
    return {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        startHold(action);
      },
      onPointerUp: stopHold,
      onPointerCancel: stopHold,
    };
  }

  return (
    <div className="wait-table wait-pit">
      <div className="wait-modes" role="tablist" aria-label="How this pit sits">
        <HouseButton
          aria-pressed={mode === "sit"}
          className={mode === "sit" ? "is-on" : undefined}
          onClick={() => {
            setMode("sit");
            reset();
          }}
        >
          You vs house
        </HouseButton>
        <HouseButton
          aria-pressed={mode === "watch"}
          className={mode === "watch" ? "is-on" : undefined}
          onClick={() => {
            setMode("watch");
            reset();
          }}
        >
          House vs house
        </HouseButton>
      </div>
      <p className="hall-kicker">
        {name} · v {version}
      </p>
      <p className="wait-pit-lead">
        {watch
          ? "Watch two books sit this pit. No gold leaves. The pot stays on the real table."
          : "Sit this pit against the book. Click a color. Hold to keep sitting it. No gold leaves."}
      </p>
      <div className="wait-pit-clock" aria-hidden="true">
        <i style={{ width: `${(sit.remaining / rules.seconds) * 100}%` }} />
      </div>
      <p className="wait-board-meta">
        {sit.remaining > 0 ? `${sit.remaining}s left` : "Settled"}
        {dark ? " · dark" : ""}
      </p>
      <ul className="wait-pit-coins">
        {hues.map((hue, i) => {
          const count = shown[i] ?? 0;
          const score = sit.scores[i] ?? 0;
          const yours = sit.you[i] ?? 0;
          const west = sit.west[i] ?? 0;
          const east = sit.east[i] ?? 0;
          const inner = (
            <>
              <p className="wait-pit-name">{hue.name}</p>
              <p className="wait-pit-count">{dark ? "—" : count}</p>
              <p className="wait-pit-split">
                {dark
                  ? "hidden"
                  : watch
                    ? `West ${west} · East ${east}`
                    : `You ${yours} · House ${west}`}
              </p>
              <span className="wait-pit-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
              <p className="wait-pit-q">
                Q {score.toFixed(2)}
                <i style={{ width: `${(Math.abs(score) / maxScore) * 100}%` }} />
              </p>
            </>
          );
          return (
            <li key={hue.id}>
              {watch || sit.over ? (
                <div
                  className={`wait-pit-coin ${sit.pick === i ? "is-on" : ""} ${dark ? "is-dark" : ""}`}
                  style={{ "--hue": hue.hex } as CSSProperties}
                >
                  {inner}
                </div>
              ) : (
                <button
                  className={`wait-pit-coin ${sit.pick === i ? "is-on" : ""} ${dark ? "is-dark" : ""}`}
                  style={{ "--hue": hue.hex } as CSSProperties}
                  type="button"
                  {...holdPad(i)}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="wait-keys">
        {watch
          ? "Both books click the same pot. Ties come back. This is not a real take."
          : `Click a coin or press ${hues.map((_, i) => i + 1).join(" · ")}. Hold to run. Ties come back.`}
      </p>
      <div className="wait-think">
        <p className="wait-shelf-kicker">How this sit thinks</p>
        <p className="wait-think-line">
          Q = w · φ on {PIT_FEATURES.join(", ")}. Last house click {hues[sit.pick]?.name ?? "—"}.
        </p>
        <ul className="wait-think-list">
          {(sit.parts.length
            ? sit.parts
            : PIT_FEATURES.map((row, i) => ({
                name: row,
                value: 0,
                weight: weights[i] ?? 0,
                pull: 0,
              }))
          ).map((row) => (
            <li key={row.name}>
              <em>{row.name}</em>
              <span>
                w {row.weight.toFixed(2)} · φ {row.value.toFixed(2)}
              </span>
              <b style={{ width: `${Math.min(100, Math.abs(row.pull) * 28)}%` }} className={row.pull < 0 ? "is-neg" : ""} />
            </li>
          ))}
        </ul>
      </div>
      <p className="wait-result">{sit.over || "A sit of the book. The pot stays on the real table."}</p>
      <p className="wait-learn">
        House watched {sits} sits · {takes} landed on a taking color
      </p>
      <div className="wait-tools">
        <HouseButton onClick={reset}>
          New sit
        </HouseButton>
      </div>
    </div>
  );
}
