"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { HouseButton } from "@/components/HouseUi";
import { WaitPick } from "@/components/WaitPick";
import { CATCH_COLS, CATCH_PAD, CATCH_ROWS, newCatch, stepCatch, type CatchState } from "@/lib/catch";
import { catchFeatures, catchReward, stepCatchHouse } from "@/lib/catch-ai";
import { CATCH_DEEP_WEIGHTS, CATCH_FIRST_WEIGHTS } from "@/lib/catch-weights";
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

const TOKEN = "#8ee4a8";
const PAD = "#3dffb0";

function Well({ name, state, you }: { name: string; state: CatchState; you?: boolean }) {
  const cells: { cls: string; fill?: string }[] = [];
  for (let y = 0; y < CATCH_ROWS; y++) {
    for (let x = 0; x < CATCH_COLS; x++) {
      const token = state.alive && y === state.tokenY && x === state.tokenX;
      const pad = y === CATCH_ROWS - 1 && x >= state.paddle && x < state.paddle + CATCH_PAD;
      cells.push(token ? { cls: "is-live", fill: TOKEN } : pad ? { cls: "is-fill", fill: PAD } : { cls: "" });
    }
  }
  return (
    <div className={`wait-board ${you ? "is-you" : ""} ${state.alive ? "" : "is-out"}`}>
      <p className="wait-board-name">{name}</p>
      <p className="wait-board-meta">
        {state.score} caught · {state.misses} miss
      </p>
      <div className="wait-well is-catch" style={{ "--cols": CATCH_COLS, "--rows": CATCH_ROWS } as CSSProperties}>
        <div className="wait-grid">
          {cells.map((cell, i) => (
            <i key={i} className={cell.cls} style={cell.fill ? { background: cell.fill } : undefined} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CatchClient({ marks, sit = "" }: { marks: PublicMark[]; sit?: string }) {
  const { westId, eastId, setWestId, setEastId } = useDeskSit("catch", sit);
  const [mode, setMode] = useState<Mode>("watch");
  const youRng = useRef(makeRng(freshSeed()));
  const houseRng = useRef(makeRng(freshSeed()));
  const [you, setYou] = useState(() => newCatch(youRng.current));
  const [house, setHouse] = useState(() => newCatch(houseRng.current));
  const [book, setBook] = useState<Snap>({
    weights: [...CATCH_FIRST_WEIGHTS],
    pieces: 0,
    games: 0,
    userPieces: 0,
    bestScore: 0,
  });
  const westWeightsRef = useRef(CATCH_FIRST_WEIGHTS);
  const eastWeightsRef = useRef(CATCH_DEEP_WEIGHTS);
  const westIdRef = useRef(westId);
  const eastIdRef = useRef(eastId);
  const modeRef = useRef(mode);
  const move = useRef<-1 | 0 | 1>(0);
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
    setYou(newCatch(youRng.current));
    setHouse(newCatch(houseRng.current));
  }, [westId, eastId]);

  useEffect(() => {
    let live = true;
    void fetch("/api/wait/lab?game=catch")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Snap | null) => {
        if (!live || !data?.weights?.length) return;
        setBook(data);
        if (westIdRef.current === "catch-live") westWeightsRef.current = data.weights;
        if (eastIdRef.current === "catch-live") eastWeightsRef.current = data.weights;
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const learn = useCallback((before: CatchState, after: CatchState, source: "user" | "house", liveId: string) => {
    if (liveId !== "catch-live") return;
    void fetch("/api/wait/lab", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        game: "catch",
        before: catchFeatures(before),
        after: catchFeatures(after),
        reward: catchReward(before, after),
        source,
        score: after.score,
        gameOver: !after.alive,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Snap | null) => {
        if (!data?.weights?.length) return;
        setBook(data);
        if (westIdRef.current === "catch-live") westWeightsRef.current = data.weights;
        if (eastIdRef.current === "catch-live") eastWeightsRef.current = data.weights;
      })
      .catch(() => undefined);
  }, []);

  const deal = useCallback(() => {
    youRng.current = makeRng(freshSeed());
    houseRng.current = makeRng(freshSeed());
    setYou(newCatch(youRng.current));
    setHouse(newCatch(houseRng.current));
  }, []);

  const pickMode = (next: Mode) => {
    setMode(next);
    deal();
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setYou((state) => {
        if (modeRef.current === "watch") {
          const next = stepCatchHouse(state, westWeightsRef.current, youRng.current);
          if (next !== state) learn(state, next, "house", westIdRef.current);
          return next;
        }
        const next = stepCatch(state, move.current, youRng.current);
        if (next !== state) learn(state, next, "user", westIdRef.current);
        return next;
      });
      setHouse((state) => {
        const next = stepCatchHouse(state, eastWeightsRef.current, houseRng.current);
        if (next !== state) learn(state, next, "house", eastIdRef.current);
        return next;
      });
    }, 140);
    return () => window.clearInterval(id);
  }, [learn]);

  useEffect(() => {
    if (you.alive || house.alive) return;
    const wait = window.setTimeout(() => deal(), 1100);
    return () => window.clearTimeout(wait);
  }, [deal, house.alive, you.alive]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "a") move.current = -1;
      if (event.key === "ArrowRight" || event.key === "d") move.current = 1;
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "ArrowRight" || event.key === "d") {
        move.current = 0;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  function holdPad(dir: -1 | 1) {
    return {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        move.current = dir;
      },
      onPointerUp: () => {
        move.current = 0;
      },
      onPointerCancel: () => {
        move.current = 0;
      },
    };
  }

  const over = !you.alive || !house.alive;
  const line =
    !you.alive && !house.alive
      ? you.score === house.score
        ? "Both pads missed out. Same catch."
        : you.score > house.score
          ? mode === "watch"
            ? "West caught more."
            : "You caught more."
          : mode === "watch"
            ? "East caught more."
            : "The house caught more."
      : !you.alive
        ? mode === "watch"
          ? "West missed out."
          : "You missed out."
        : !house.alive
          ? mode === "watch"
            ? "East missed out."
            : "The house missed out."
          : "";

  return (
    <div className="wait-table">
      <div className="wait-modes" role="tablist" aria-label="How catch sits">
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
        />
        <Well
          name={marks.find((row) => row.id === eastId)?.name || (mode === "watch" ? "East" : "The house")}
          state={house}
        />
      </div>
      <p className="wait-keys">
        {mode === "sit"
          ? "Hold left or right. Three misses and the sit ends. A finished sit deals again."
          : "Two models sit. Pick a different book for each pad. A finished sit deals again."}
      </p>
      {over ? <p className="wait-result">{line}</p> : <p className="wait-result">No gold on this well. The pot stays on Classic.</p>}
      <p className="wait-learn">
        Open catch sat {book.pieces} locks · {book.userPieces} from seats · best {book.bestScore} caught
      </p>
      <div className="wait-tools">
        <HouseButton onClick={deal}>
          New sit
        </HouseButton>
        {mode === "sit" ? (
          <>
            <button className="wait-pad" type="button" {...holdPad(-1)}>
              Left
            </button>
            <button className="wait-pad" type="button" {...holdPad(1)}>
              Right
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
