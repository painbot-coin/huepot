"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { HouseButton } from "@/components/HouseUi";
import { WaitPick } from "@/components/WaitPick";
import { useDeskSit } from "@/components/use-desk-sit";
import type { PublicMark } from "@/lib/house-mark-list";
import { SNAKE_N, newSnake, stepSnake, type SnakeDir, type SnakeState } from "@/lib/snake";
import { snakeFeatures, snakeReward, stepSnakeHouse } from "@/lib/snake-ai";
import { SNAKE_DEEP_WEIGHTS, SNAKE_FIRST_WEIGHTS } from "@/lib/snake-weights";
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

const HEAD = "#8ee4a8";
const BODY = "#3dffb0";
const FOOD = "#ff355e";

function Well({ name, state, you }: { name: string; state: SnakeState; you?: boolean }) {
  const body = new Set(state.body);
  const head = state.body[0];
  return (
    <div className={`wait-board ${you ? "is-you" : ""} ${state.alive ? "" : "is-out"}`}>
      <p className="wait-board-name">{name}</p>
      <p className="wait-board-meta">{state.score} ate</p>
      <div className="wait-well is-snake" style={{ "--cols": SNAKE_N, "--rows": SNAKE_N } as CSSProperties}>
        <div className="wait-grid">
          {Array.from({ length: SNAKE_N * SNAKE_N }, (_, i) => {
            const cls = i === head ? "is-live" : i === state.food ? "is-junk" : body.has(i) ? "is-fill" : "";
            const fill = i === head ? HEAD : i === state.food ? FOOD : body.has(i) ? BODY : undefined;
            return <i key={i} className={cls} style={fill ? { background: fill } : undefined} />;
          })}
        </div>
      </div>
    </div>
  );
}

export function SnakeClient({ marks, sit = "" }: { marks: PublicMark[]; sit?: string }) {
  const { westId, eastId, setWestId, setEastId } = useDeskSit("snake", sit);
  const [mode, setMode] = useState<Mode>("watch");
  const youRng = useRef(makeRng(freshSeed()));
  const houseRng = useRef(makeRng(freshSeed()));
  const [you, setYou] = useState(() => newSnake(youRng.current));
  const [house, setHouse] = useState(() => newSnake(houseRng.current));
  const [book, setBook] = useState<Snap>({
    weights: [...SNAKE_FIRST_WEIGHTS],
    pieces: 0,
    games: 0,
    userPieces: 0,
    bestScore: 0,
  });
  const westWeightsRef = useRef(SNAKE_FIRST_WEIGHTS);
  const eastWeightsRef = useRef(SNAKE_DEEP_WEIGHTS);
  const westIdRef = useRef(westId);
  const eastIdRef = useRef(eastId);
  const modeRef = useRef(mode);
  const turn = useRef<-1 | 0 | 1>(0);
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
    setYou(newSnake(youRng.current));
    setHouse(newSnake(houseRng.current));
    turn.current = 0;
  }, [westId, eastId]);

  useEffect(() => {
    let live = true;
    void fetch("/api/wait/lab?game=snake")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Snap | null) => {
        if (!live || !data?.weights?.length) return;
        setBook(data);
        if (westIdRef.current === "snake-live") westWeightsRef.current = data.weights;
        if (eastIdRef.current === "snake-live") eastWeightsRef.current = data.weights;
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const learn = useCallback((before: SnakeState, after: SnakeState, source: "user" | "house", liveId: string) => {
    if (liveId !== "snake-live") return;
    void fetch("/api/wait/lab", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        game: "snake",
        before: snakeFeatures(before),
        after: snakeFeatures(after),
        reward: snakeReward(before, after),
        source,
        score: after.score,
        gameOver: !after.alive,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Snap | null) => {
        if (!data?.weights?.length) return;
        setBook(data);
        if (westIdRef.current === "snake-live") westWeightsRef.current = data.weights;
        if (eastIdRef.current === "snake-live") eastWeightsRef.current = data.weights;
      })
      .catch(() => undefined);
  }, []);

  const deal = useCallback(() => {
    youRng.current = makeRng(freshSeed());
    houseRng.current = makeRng(freshSeed());
    setYou(newSnake(youRng.current));
    setHouse(newSnake(houseRng.current));
    turn.current = 0;
  }, []);

  const pickMode = (next: Mode) => {
    setMode(next);
    deal();
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setYou((state) => {
        if (!state.alive) return state;
        const next =
          modeRef.current === "watch"
            ? stepSnakeHouse(state, westWeightsRef.current, youRng.current)
            : stepSnake(state, turn.current, youRng.current);
        turn.current = 0;
        if (next !== state) {
          learn(state, next, modeRef.current === "sit" ? "user" : "house", westIdRef.current);
        }
        return next;
      });
      setHouse((state) => {
        if (!state.alive) return state;
        const next = stepSnakeHouse(state, eastWeightsRef.current, houseRng.current);
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (modeRef.current !== "sit") return;
      const map: Record<string, SnakeDir> = {
        ArrowUp: 0,
        w: 0,
        ArrowRight: 1,
        d: 1,
        ArrowDown: 2,
        s: 2,
        ArrowLeft: 3,
        a: 3,
      };
      const want = map[event.key];
      if (want == null) return;
      event.preventDefault();
      setYou((state) => {
        const diff = (want - state.dir + 4) % 4;
        turn.current = diff === 1 ? 1 : diff === 3 ? -1 : 0;
        return state;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const over = !you.alive || !house.alive;
  const line =
    !you.alive && !house.alive
      ? you.score === house.score
        ? "Both snakes hit a wall. Same eat."
        : you.score > house.score
          ? mode === "watch"
            ? "West ate more."
            : "You ate more."
          : mode === "watch"
            ? "East ate more."
            : "The house ate more."
      : !you.alive
        ? mode === "watch"
          ? "West hit a wall."
          : "You hit a wall."
        : !house.alive
          ? mode === "watch"
            ? "East hit a wall."
            : "The house hit a wall."
          : "";

  return (
    <div className="wait-table">
      <div className="wait-modes" role="tablist" aria-label="How snake sits">
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
          ? "Arrows or WASD to turn. A wall ends the sit. A finished sit deals again."
          : "Two models sit. Pick a different book for each snake. A finished sit deals again."}
      </p>
      {over ? <p className="wait-result">{line}</p> : <p className="wait-result">No gold on this well. The pot stays on Classic.</p>}
      <p className="wait-learn">
        Open snake sat {book.pieces} locks · {book.userPieces} from seats · best {book.bestScore} ate
      </p>
      <div className="wait-tools">
        <HouseButton onClick={deal}>
          New sit
        </HouseButton>
      </div>
    </div>
  );
}
