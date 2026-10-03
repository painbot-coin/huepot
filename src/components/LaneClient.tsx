"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { HouseButton } from "@/components/HouseUi";
import { WaitPick } from "@/components/WaitPick";
import { useDeskSit } from "@/components/use-desk-sit";
import type { PublicMark } from "@/lib/house-mark-list";
import { LANE_N, newLane, stepLane, strikeLane, type LaneState } from "@/lib/lane";
import { laneFeatures, laneReward, stepLaneHouse } from "@/lib/lane-ai";
import { LANE_DEEP_WEIGHTS, LANE_FIRST_WEIGHTS } from "@/lib/lane-weights";
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

const MARK = "#8ee4a8";
const RIPE = "#ff355e";
const WELL = "#3dffb0";

function Well({
  name,
  state,
  you,
  onStrike,
}: {
  name: string;
  state: LaneState;
  you?: boolean;
  onStrike?: () => void;
}) {
  return (
    <div className={`wait-board ${you ? "is-you" : ""} ${state.alive ? "" : "is-out"}`}>
      <p className="wait-board-name">{name}</p>
      <p className="wait-board-meta">
        {state.score} last · {state.misses} miss · hp {state.hp}
      </p>
      <div className="wait-well is-lane" style={{ "--cols": 1, "--rows": LANE_N } as CSSProperties}>
        <div className="wait-grid">
          {Array.from({ length: LANE_N }, (_, i) => {
            const pos = LANE_N - 1 - i;
            const mark = state.alive && pos === state.pos;
            const well = pos === 0;
            const ripe = mark && state.hp === 1;
            const fill = mark ? (ripe ? RIPE : MARK) : well ? WELL : undefined;
            const cls = mark ? (ripe ? "is-junk" : "is-live") : well ? "is-fill" : "";
            return (
              <button
                key={i}
                type="button"
                className={cls}
                style={fill ? { background: fill } : undefined}
                disabled={!you || !state.alive || !onStrike}
                onClick={() => onStrike?.()}
                aria-label={mark ? (ripe ? "Ripe mark" : "Mark") : well ? "Well" : `Lane ${pos}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LaneClient({ marks, sit = "" }: { marks: PublicMark[]; sit?: string }) {
  const { westId, eastId, setWestId, setEastId } = useDeskSit("lane", sit);
  const [mode, setMode] = useState<Mode>("watch");
  const youRng = useRef(makeRng(freshSeed()));
  const houseRng = useRef(makeRng(freshSeed()));
  const [you, setYou] = useState(() => newLane(youRng.current));
  const [house, setHouse] = useState(() => newLane(houseRng.current));
  const [book, setBook] = useState<Snap>({
    weights: [...LANE_FIRST_WEIGHTS],
    pieces: 0,
    games: 0,
    userPieces: 0,
    bestScore: 0,
  });
  const westWeightsRef = useRef(LANE_FIRST_WEIGHTS);
  const eastWeightsRef = useRef(LANE_DEEP_WEIGHTS);
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
    setYou(newLane(youRng.current));
    setHouse(newLane(houseRng.current));
  }, [westId, eastId]);

  useEffect(() => {
    let live = true;
    void fetch("/api/wait/lab?game=lane")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Snap | null) => {
        if (!live || !data?.weights?.length) return;
        setBook(data);
        if (westIdRef.current === "lane-live") westWeightsRef.current = data.weights;
        if (eastIdRef.current === "lane-live") eastWeightsRef.current = data.weights;
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const learn = useCallback((before: LaneState, after: LaneState, source: "user" | "house", liveId: string) => {
    if (liveId !== "lane-live") return;
    void fetch("/api/wait/lab", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        game: "lane",
        before: laneFeatures(before),
        after: laneFeatures(after),
        reward: laneReward(before, after),
        source,
        score: after.score,
        gameOver: !after.alive,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Snap | null) => {
        if (!data?.weights?.length) return;
        setBook(data);
        if (westIdRef.current === "lane-live") westWeightsRef.current = data.weights;
        if (eastIdRef.current === "lane-live") eastWeightsRef.current = data.weights;
      })
      .catch(() => undefined);
  }, []);

  const deal = useCallback(() => {
    youRng.current = makeRng(freshSeed());
    houseRng.current = makeRng(freshSeed());
    setYou(newLane(youRng.current));
    setHouse(newLane(houseRng.current));
  }, []);

  const pickMode = (next: Mode) => {
    setMode(next);
    deal();
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setYou((state) => {
        if (modeRef.current === "sit") {
          const next = stepLane(state, false, youRng.current);
          if (next !== state) learn(state, next, "user", westIdRef.current);
          return next;
        }
        const next = stepLaneHouse(state, westWeightsRef.current, youRng.current);
        if (next !== state) learn(state, next, "house", westIdRef.current);
        return next;
      });
      setHouse((state) => {
        const next = stepLaneHouse(state, eastWeightsRef.current, houseRng.current);
        if (next !== state) learn(state, next, "house", eastIdRef.current);
        return next;
      });
    }, 220);
    return () => window.clearInterval(id);
  }, [learn]);

  useEffect(() => {
    if (you.alive || house.alive) return;
    const wait = window.setTimeout(() => deal(), 1100);
    return () => window.clearTimeout(wait);
  }, [deal, house.alive, you.alive]);

  useEffect(() => {
    if (mode !== "sit") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      setYou((state) => {
        const next = strikeLane(state, youRng.current);
        if (next !== state) learn(state, next, "user", westIdRef.current);
        return next;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [learn, mode]);

  const strike = () => {
    if (modeRef.current !== "sit") return;
    setYou((state) => {
      const next = strikeLane(state, youRng.current);
      if (next !== state) learn(state, next, "user", westIdRef.current);
      return next;
    });
  };

  const over = !you.alive || !house.alive;
  const line =
    !you.alive && !house.alive
      ? you.score === house.score
        ? "Both lanes ended. Same last hits."
        : you.score > house.score
          ? mode === "watch"
            ? "West last-hit more."
            : "You last-hit more."
          : mode === "watch"
            ? "East last-hit more."
            : "The house last-hit more."
      : !you.alive
        ? mode === "watch"
          ? "West used its marks."
          : "You used your marks."
        : !house.alive
          ? mode === "watch"
            ? "East used its marks."
            : "The house used its marks."
          : "";

  return (
    <div className="wait-table">
      <div className="wait-modes" role="tablist" aria-label="How lane sits">
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
          onStrike={mode === "sit" ? strike : undefined}
        />
        <Well
          name={marks.find((row) => row.id === eastId)?.name || (mode === "watch" ? "East" : "The house")}
          state={house}
        />
      </div>
      <p className="wait-keys">
        {mode === "sit"
          ? "Strike the red mark at the well. Eight marks. Not Dota. Space or click. A finished sit deals again."
          : "Two models last-hit. Pick a different book for each well. A finished sit deals again."}
      </p>
      {over ? <p className="wait-result">{line}</p> : <p className="wait-result">No gold on this well. The pot stays on Classic.</p>}
      <p className="wait-learn">
        Open lane sat {book.pieces} locks · {book.userPieces} from seats · best {book.bestScore} last
      </p>
      <div className="wait-tools">
        {mode === "sit" ? (
          <HouseButton disabled={!you.alive} onClick={strike}>
            Strike
          </HouseButton>
        ) : null}
        <HouseButton onClick={deal}>
          New sit
        </HouseButton>
      </div>
    </div>
  );
}
