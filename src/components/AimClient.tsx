"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { HouseButton } from "@/components/HouseUi";
import { WaitPick } from "@/components/WaitPick";
import { AIM_N, flickAim, newAim, type AimState } from "@/lib/aim";
import { aimFeatures, aimReward, stepAimHouse } from "@/lib/aim-ai";
import { AIM_DEEP_WEIGHTS, AIM_FIRST_WEIGHTS } from "@/lib/aim-weights";
import { useDeskSit } from "@/components/use-desk-sit";
import type { PublicMark } from "@/lib/house-mark-list";
import { fetchPlay } from "@/lib/wait-play";

type Mode = "sit" | "watch";
type Snap = { weights: number[]; pieces: number; games: number; userPieces: number; bestScore: number };

function freshSeed() {
  return (Math.floor(Math.random() * 0xffffffff) || 1) >>> 0;
}

function makeRng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const CURSOR = "#8ee4a8";
const TARGET = "#ff355e";

function Well({
  name,
  state,
  you,
  onFlick,
}: {
  name: string;
  state: AimState;
  you?: boolean;
  onFlick?: (cell: number) => void;
}) {
  return (
    <div className={`wait-board ${you ? "is-you" : ""} ${state.alive ? "" : "is-out"}`}>
      <p className="wait-board-name">{name}</p>
      <p className="wait-board-meta">
        {state.score} hit · {state.misses} miss · {state.time}
      </p>
      <div className="wait-well is-aim" style={{ "--cols": AIM_N, "--rows": AIM_N } as CSSProperties}>
        <div className="wait-grid">
          {Array.from({ length: AIM_N * AIM_N }, (_, i) => {
            const cls = i === state.cursor ? "is-live" : i === state.target ? "is-junk" : "";
            const fill = i === state.cursor ? CURSOR : i === state.target ? TARGET : undefined;
            return (
              <button
                key={i}
                type="button"
                className={cls}
                style={fill ? { background: fill } : undefined}
                disabled={!you || !state.alive || !onFlick}
                onClick={() => onFlick?.(i)}
                aria-label={i === state.target ? "Mark" : `Cell ${i}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AimClient({ marks, sit = "" }: { marks: PublicMark[]; sit?: string }) {
  const { westId, eastId, setWestId, setEastId } = useDeskSit("aim", sit);
  const [mode, setMode] = useState<Mode>("watch");
  const youRng = useRef(makeRng(freshSeed()));
  const houseRng = useRef(makeRng(freshSeed()));
  const [you, setYou] = useState(() => newAim(youRng.current));
  const [house, setHouse] = useState(() => newAim(houseRng.current));
  const [book, setBook] = useState<Snap>({
    weights: [...AIM_FIRST_WEIGHTS],
    pieces: 0,
    games: 0,
    userPieces: 0,
    bestScore: 0,
  });
  const westWeightsRef = useRef(AIM_FIRST_WEIGHTS);
  const eastWeightsRef = useRef(AIM_DEEP_WEIGHTS);
  const westIdRef = useRef(westId);
  const eastIdRef = useRef(eastId);
  const modeRef = useRef(mode);
  const firstDeal = useRef(true);

  useEffect(() => {
    westIdRef.current = westId;
  }, [westId]);

  useEffect(() => {
    eastIdRef.current = eastId;
  }, [eastId]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    let live = true;
    void fetchPlay(westId).then((data) => {
      if (!live || !data?.weights?.length) return;
      westWeightsRef.current = data.weights;
    });
    return () => {
      live = false;
    };
  }, [westId]);

  useEffect(() => {
    let live = true;
    void fetchPlay(eastId).then((data) => {
      if (!live || !data?.weights?.length) return;
      eastWeightsRef.current = data.weights;
    });
    return () => {
      live = false;
    };
  }, [eastId]);

  useEffect(() => {
    if (firstDeal.current) {
      firstDeal.current = false;
      return;
    }
    youRng.current = makeRng(freshSeed());
    houseRng.current = makeRng(freshSeed());
    setYou(newAim(youRng.current));
    setHouse(newAim(houseRng.current));
  }, [westId, eastId]);

  useEffect(() => {
    let live = true;
    void fetch("/api/wait/lab?game=aim")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Snap | null) => {
        if (!live || !data?.weights?.length) return;
        setBook(data);
        if (westIdRef.current === "aim-live") westWeightsRef.current = data.weights;
        if (eastIdRef.current === "aim-live") eastWeightsRef.current = data.weights;
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const learn = useCallback((before: AimState, after: AimState, source: "user" | "house", liveId: string) => {
    if (liveId !== "aim-live") return;
    void fetch("/api/wait/lab", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        game: "aim",
        before: aimFeatures(before),
        after: aimFeatures(after),
        reward: aimReward(before, after),
        source,
        score: after.score,
        gameOver: !after.alive,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Snap | null) => {
        if (!data?.weights?.length) return;
        setBook(data);
        if (westIdRef.current === "aim-live") westWeightsRef.current = data.weights;
        if (eastIdRef.current === "aim-live") eastWeightsRef.current = data.weights;
      })
      .catch(() => undefined);
  }, []);

  const deal = useCallback(() => {
    youRng.current = makeRng(freshSeed());
    houseRng.current = makeRng(freshSeed());
    setYou(newAim(youRng.current));
    setHouse(newAim(houseRng.current));
  }, []);

  const pickMode = (next: Mode) => {
    setMode(next);
    deal();
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setYou((state) => {
        if (modeRef.current === "sit") return state;
        const next = stepAimHouse(state, westWeightsRef.current, youRng.current);
        if (next !== state) learn(state, next, "house", westIdRef.current);
        return next;
      });
      setHouse((state) => {
        const next = stepAimHouse(state, eastWeightsRef.current, houseRng.current);
        if (next !== state) learn(state, next, "house", eastIdRef.current);
        return next;
      });
    }, 160);
    return () => window.clearInterval(id);
  }, [learn]);

  useEffect(() => {
    if (you.alive || house.alive) return;
    const wait = window.setTimeout(() => deal(), 1100);
    return () => window.clearTimeout(wait);
  }, [deal, house.alive, you.alive]);

  const flick = (cell: number) => {
    if (modeRef.current !== "sit") return;
    setYou((state) => {
      const next = flickAim(state, cell, youRng.current);
      if (next !== state) learn(state, next, "user", westIdRef.current);
      return next;
    });
  };

  const over = !you.alive || !house.alive;
  const line =
    !you.alive && !house.alive
      ? you.score === house.score
        ? "Both flicks ended. Same hits."
        : you.score > house.score
          ? mode === "watch"
            ? "West hit more."
            : "You hit more."
          : mode === "watch"
            ? "East hit more."
            : "The house hit more."
      : !you.alive
        ? mode === "watch"
          ? "West used its rounds."
          : "You used your rounds."
        : !house.alive
          ? mode === "watch"
            ? "East used its rounds."
            : "The house used its rounds."
          : "";

  return (
    <div className="wait-table">
      <div className="wait-modes" role="tablist" aria-label="How aim sits">
        <HouseButton
          aria-pressed={mode === "watch"}
          className={mode === "watch" ? "is-on" : undefined}
          onClick={() => pickMode("watch")}
        >
          Watch houses
        </HouseButton>
        <HouseButton
          aria-pressed={mode === "sit"}
          className={mode === "sit" ? "is-on" : undefined}
          onClick={() => pickMode("sit")}
        >
          Play with the house
        </HouseButton>
      </div>
      <div className="wait-sides">
        {mode === "watch" ? (
          <WaitPick label="West" marks={marks} value={westId} onChange={setWestId} />
        ) : (
          <p className="wait-pick">
            <span>You</span>
          </p>
        )}
        <WaitPick
          label={mode === "watch" ? "East" : "The house"}
          marks={marks}
          value={eastId}
          onChange={setEastId}
        />
      </div>
      <div className="wait-boards">
        <Well
          name={mode === "watch" ? marks.find((row) => row.id === westId)?.name || "West" : "You"}
          state={you}
          you={mode === "sit"}
          onFlick={mode === "sit" ? flick : undefined}
        />
        <Well
          name={marks.find((row) => row.id === eastId)?.name || (mode === "watch" ? "East" : "The house")}
          state={house}
        />
      </div>
      <p className="wait-keys">
        {mode === "sit"
          ? "Click the red mark. Eight rounds. Not Counter-Strike. A finished sit deals again."
          : "Two models flick. Pick a different book for each well. A finished sit deals again."}
      </p>
      {over ? <p className="wait-result">{line}</p> : <p className="wait-result">No gold on this well. The pot stays on Classic.</p>}
      <p className="wait-learn">
        Open aim sat {book.pieces} locks · {book.userPieces} from seats · best {book.bestScore} hit
      </p>
      <div className="wait-tools">
        <HouseButton onClick={deal}>
          New sit
        </HouseButton>
      </div>
    </div>
  );
}
