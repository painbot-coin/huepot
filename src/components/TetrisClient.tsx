"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { HouseButton } from "@/components/HouseUi";
import {
  COLS,
  ROWS,
  cellsOf,
  ghostY,
  hardDrop,
  makeRng,
  newGame,
  receiveGarbage,
  rotate,
  sendOf,
  shift,
  softDrop,
  type Cell,
  type PieceId,
  type TetrisState,
} from "@/lib/tetris";
import { WaitPick } from "@/components/WaitPick";
import { useDeskSit } from "@/components/use-desk-sit";
import type { PublicMark } from "@/lib/house-mark-list";
import { stepHouse } from "@/lib/tetris-ai";
import { stackStyleByMark } from "@/lib/tetris-style";
import { HOUSE_STACK_WEIGHTS } from "@/lib/tetris-weights";
import { fetchPlay } from "@/lib/wait-play";

const FILL: Record<PieceId | "X", string> = {
  I: "#2ea8ff",
  O: "#ffb020",
  T: "#a46bff",
  S: "#d4ff2e",
  Z: "#ff355e",
  J: "#3dffb0",
  L: "#ff7a18",
  X: "#3a3a48",
};

const DAS_MS = 110;
const ARR_MS = 22;
const SOFT_MS = 22;
const HOUSE_MS = 140;
const GRAVITY_MS = 380;

type Mode = "sit" | "watch";
type Side = "you" | "house";

type StackSnap = {
  weights: number[];
  pieces: number;
  games: number;
  userPieces: number;
  housePieces: number;
  bestLines: number;
};

function freshSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 1_000_000_000)) >>> 0 || 1;
}

function gapOf(cursor: number) {
  return ((cursor * 3) + 1) % COLS;
}

function Board({
  state,
  name,
  you,
}: {
  state: TetrisState;
  name: string;
  you?: boolean;
}) {
  const prevY = useRef(state.y);
  const dropping = state.y - prevY.current > 2;
  useEffect(() => {
    prevY.current = state.y;
  }, [state.y]);

  const gy = state.alive ? ghostY(state) : 0;
  const minos = state.alive ? cellsOf(state.piece, state.rot, 0, 0) : [];
  const x = `${state.x * 10}%`;
  const y = `${state.y * 5}%`;
  const ghostTop = `${gy * 5}%`;

  return (
    <div className={`wait-board ${you ? "is-you" : ""} ${state.alive ? "" : "is-out"}`}>
      <p className="wait-board-name">{name}</p>
      <div className="wait-well" style={{ "--cols": COLS, "--rows": ROWS } as CSSProperties}>
        <div className="wait-grid">
          {state.grid.map((cell, i) => (
            <i
              key={i}
              className={cell ? (cell === "X" ? "is-fill is-junk" : "is-fill") : ""}
              style={cell ? { background: FILL[cell] } : undefined}
            />
          ))}
        </div>
        {state.alive ? (
          <>
            <div className="wait-float wait-ghost" style={{ transform: `translate(${x}, ${ghostTop})` }}>
              {minos.map((cell, i) => (
                <i
                  key={i}
                  style={{
                    left: `${cell.x * 10}%`,
                    top: `${cell.y * 5}%`,
                    background: FILL[state.piece],
                  }}
                />
              ))}
            </div>
            <div
              className={`wait-float wait-piece ${dropping ? "is-drop" : ""}`}
              key={`${state.cursor}-${state.piece}`}
              style={{ transform: `translate(${x}, ${y})` }}
            >
              {minos.map((cell, i) => (
                <i
                  key={i}
                  className="is-live"
                  style={{
                    left: `${cell.x * 10}%`,
                    top: `${cell.y * 5}%`,
                    background: FILL[state.piece],
                  }}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
      <p className="wait-board-meta">
        {state.lines} lines · {state.score}
        {state.alive ? "" : " · out"}
      </p>
      <p className="wait-next">
        Next
        {state.queue.slice(0, 2).map((id, i) => (
          <em key={`${id}-${i}`} style={{ background: FILL[id] }} title={id} />
        ))}
      </p>
    </div>
  );
}

export function TetrisClient({ marks, sit = "" }: { marks: PublicMark[]; sit?: string }) {
  const { westId, eastId, setWestId, setEastId } = useDeskSit("wait", sit);
  const [mode, setMode] = useState<Mode>("watch");
  const [dealId, setDealId] = useState(0);
  const [westWeights, setWestWeights] = useState(HOUSE_STACK_WEIGHTS);
  const [eastWeights, setEastWeights] = useState(HOUSE_STACK_WEIGHTS);
  const youRng = useRef(makeRng(freshSeed()));
  const houseRng = useRef(makeRng(freshSeed()));
  const [you, setYou] = useState(() => newGame(youRng.current));
  const [house, setHouse] = useState(() => newGame(houseRng.current));
  const [book, setBook] = useState<StackSnap>({
    weights: [...HOUSE_STACK_WEIGHTS],
    pieces: 0,
    games: 0,
    userPieces: 0,
    housePieces: 0,
    bestLines: 0,
  });
  const westWeightsRef = useRef(westWeights);
  const eastWeightsRef = useRef(eastWeights);
  const westIdRef = useRef(westId);
  const eastIdRef = useRef(eastId);
  const westStyleRef = useRef(stackStyleByMark(westId));
  const eastStyleRef = useRef(stackStyleByMark(eastId));
  const modeRef = useRef(mode);
  const learnQueue = useRef<
    { before: Cell[]; after: Cell[]; lines: number; dead: boolean; source: "user" | "house"; gameLines: number }[]
  >([]);
  const learnBusy = useRef(false);
  const dasTimer = useRef(0);
  const arrTimer = useRef(0);
  const softTimer = useRef(0);
  const held = useRef({ left: false, right: false, down: false });
  const firstDeal = useRef(true);

  useEffect(() => {
    westIdRef.current = westId;
    westStyleRef.current = stackStyleByMark(westId);
  }, [westId]);

  useEffect(() => {
    eastIdRef.current = eastId;
    eastStyleRef.current = stackStyleByMark(eastId);
  }, [eastId]);

  useEffect(() => {
    let live = true;
    void fetchPlay(westId).then((data) => {
      if (!live || !data?.weights?.length) return;
      setWestWeights(data.weights);
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
      setEastWeights(data.weights);
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
    const left = freshSeed();
    let right = freshSeed();
    if (right === left) right = (left + 0x9e3779b9) >>> 0 || left + 1;
    youRng.current = makeRng(left);
    houseRng.current = makeRng(right);
    setDealId((n) => n + 1);
    setYou(newGame(youRng.current));
    setHouse(newGame(houseRng.current));
  }, [westId, eastId]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    let live = true;
    void fetch("/api/wait/stack")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: StackSnap | null) => {
        if (!live || !data?.weights?.length) return;
        setBook(data);
        if (westIdRef.current === "wait-live") {
          westWeightsRef.current = data.weights;
          setWestWeights(data.weights);
        }
        if (eastIdRef.current === "wait-live") {
          eastWeightsRef.current = data.weights;
          setEastWeights(data.weights);
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const flushLearn = useCallback(() => {
    if (learnBusy.current) return;
    const item = learnQueue.current.shift();
    if (!item) return;
    learnBusy.current = true;
    void fetch("/api/wait/stack", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        before: item.before,
        after: item.after,
        lines: item.lines,
        dead: item.dead,
        source: item.source,
        gameLines: item.gameLines,
        gameOver: item.dead,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: StackSnap | null) => {
        if (!data?.weights?.length) return;
        setBook(data);
        if (westIdRef.current === "wait-live") {
          westWeightsRef.current = data.weights;
          setWestWeights(data.weights);
        }
        if (eastIdRef.current === "wait-live") {
          eastWeightsRef.current = data.weights;
          setEastWeights(data.weights);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        learnBusy.current = false;
        flushLearn();
      });
  }, []);

  const learn = useCallback(
    (before: Cell[], after: Cell[], lines: number, dead: boolean, source: "user" | "house", gameLines: number) => {
      learnQueue.current.push({ before, after, lines, dead, source, gameLines });
      if (learnQueue.current.length > 24) learnQueue.current.splice(0, learnQueue.current.length - 24);
      flushLearn();
    },
    [flushLearn],
  );

  const deal = useCallback(() => {
    const left = freshSeed();
    let right = freshSeed();
    if (right === left) right = (left + 0x9e3779b9) >>> 0 || left + 1;
    youRng.current = makeRng(left);
    houseRng.current = makeRng(right);
    setDealId((n) => n + 1);
    setYou(newGame(youRng.current));
    setHouse(newGame(houseRng.current));
  }, []);

  const play = useCallback(
    (side: Side, fn: (state: TetrisState) => TetrisState) => {
      const setThis = side === "you" ? setYou : setHouse;
      const setOther = side === "you" ? setHouse : setYou;
      setThis((state) => {
        if (!state.alive) return state;
        const next = fn(state);
        if (next === state) return state;
        const cleared = Math.max(0, next.lines - state.lines);
        const sent = next.cursor !== state.cursor ? sendOf(cleared) : 0;
        if (sent) {
          const gap = gapOf(next.cursor);
          queueMicrotask(() => setOther((other) => receiveGarbage(other, sent, gap)));
        }
        const liveId = side === "you" ? westIdRef.current : eastIdRef.current;
        if (next.cursor !== state.cursor && liveId === "wait-live") {
          const source = modeRef.current === "sit" && side === "you" ? "user" : "house";
          learn(state.grid, next.grid, cleared, !next.alive, source, next.lines);
        }
        return next;
      });
    },
    [learn],
  );

  const playYou = useCallback(
    (fn: (state: TetrisState) => TetrisState) => {
      if (modeRef.current !== "sit") return;
      play("you", fn);
    },
    [play],
  );

  const stopRun = useCallback(() => {
    window.clearTimeout(dasTimer.current);
    window.clearInterval(arrTimer.current);
    dasTimer.current = 0;
    arrTimer.current = 0;
  }, []);

  const stopSoft = useCallback(() => {
    window.clearInterval(softTimer.current);
    softTimer.current = 0;
  }, []);

  const startRun = useCallback(
    (dir: -1 | 1) => {
      playYou((state) => shift(state, dir));
      stopRun();
      dasTimer.current = window.setTimeout(() => {
        arrTimer.current = window.setInterval(() => {
          playYou((state) => shift(state, dir));
        }, ARR_MS);
      }, DAS_MS);
    },
    [playYou, stopRun],
  );

  const startSoft = useCallback(() => {
    playYou((state) => softDrop(state, youRng.current));
    stopSoft();
    softTimer.current = window.setInterval(() => {
      playYou((state) => softDrop(state, youRng.current));
    }, SOFT_MS);
  }, [playYou, stopSoft]);

  const pickMode = useCallback(
    (next: Mode) => {
      stopRun();
      stopSoft();
      held.current = { left: false, right: false, down: false };
      modeRef.current = next;
      setMode(next);
      deal();
    },
    [deal, stopRun, stopSoft],
  );

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      if (modeRef.current !== "sit") return;
      const key = event.key;
      const move = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "z", "Z", "x", "X", "a", "A", "d", "D", "s", "S", "w", "W"];
      if (!move.includes(key)) return;
      event.preventDefault();
      if (event.repeat) return;
      if (key === "ArrowLeft" || key === "a" || key === "A") {
        held.current.left = true;
        startRun(-1);
        return;
      }
      if (key === "ArrowRight" || key === "d" || key === "D") {
        held.current.right = true;
        startRun(1);
        return;
      }
      if (key === "ArrowDown" || key === "s" || key === "S") {
        held.current.down = true;
        startSoft();
        return;
      }
      if (key === "ArrowUp" || key === "x" || key === "X" || key === "w" || key === "W") {
        playYou((state) => rotate(state, 1));
        return;
      }
      if (key === "z" || key === "Z") {
        playYou((state) => rotate(state, -1));
        return;
      }
      if (key === " ") playYou((state) => hardDrop(state, youRng.current));
    };
    const onUp = (event: KeyboardEvent) => {
      const key = event.key;
      if (key === "ArrowLeft" || key === "a" || key === "A") {
        held.current.left = false;
        if (held.current.right) startRun(1);
        else stopRun();
      }
      if (key === "ArrowRight" || key === "d" || key === "D") {
        held.current.right = false;
        if (held.current.left) startRun(-1);
        else stopRun();
      }
      if (key === "ArrowDown" || key === "s" || key === "S") {
        held.current.down = false;
        stopSoft();
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      stopRun();
      stopSoft();
    };
  }, [playYou, startRun, startSoft, stopRun, stopSoft]);

  useEffect(() => {
    if (mode !== "sit") return;
    const drop = window.setInterval(() => {
      playYou((state) => (state.alive ? softDrop(state, youRng.current) : state));
    }, GRAVITY_MS);
    return () => window.clearInterval(drop);
  }, [dealId, mode, playYou]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      play("house", (state) =>
        stepHouse(state, eastWeightsRef.current, houseRng.current, eastStyleRef.current.id),
      );
    }, eastStyleRef.current.houseMs ?? HOUSE_MS);
    return () => window.clearInterval(tick);
  }, [dealId, play]);

  useEffect(() => {
    if (mode !== "watch") return;
    const tick = window.setInterval(() => {
      play("you", (state) =>
        stepHouse(state, westWeightsRef.current, youRng.current, westStyleRef.current.id),
      );
    }, (westStyleRef.current.houseMs ?? HOUSE_MS) + 16);
    return () => window.clearInterval(tick);
  }, [dealId, mode, play]);

  useEffect(() => {
    if (you.alive || house.alive) return;
    const wait = window.setTimeout(() => deal(), 1100);
    return () => window.clearTimeout(wait);
  }, [deal, house.alive, you.alive]);

  const over = !you.alive || !house.alive;
  const line =
    !you.alive && !house.alive
      ? you.lines === house.lines
        ? "Both stacks fell. Same lines."
        : you.lines > house.lines
          ? mode === "watch"
            ? "West stacked more."
            : "You stacked more before the fall."
          : mode === "watch"
            ? "East stacked more."
            : "The house stacked more."
      : !you.alive
        ? mode === "watch"
          ? "West reached the lintel."
          : "Your stack reached the lintel."
        : !house.alive
          ? mode === "watch"
            ? "East reached the lintel."
            : "The house stack reached the lintel."
          : "";

  function holdPad(start: () => void, end: () => void) {
    return {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        start();
      },
      onPointerUp: end,
      onPointerCancel: end,
    };
  }

  return (
    <div className="wait-table">
      <div className="wait-modes" role="tablist" aria-label="How the wait sits">
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
        <Board
          name={mode === "watch" ? marks.find((row) => row.id === westId)?.name || "West" : "You"}
          state={you}
          you={mode === "sit"}
        />
        <Board
          name={marks.find((row) => row.id === eastId)?.name || (mode === "watch" ? "East" : "The house")}
          state={house}
        />
      </div>
      <p className="wait-keys">
        {mode === "sit"
          ? "Hold left or right to run. Hold down to fall. Up or X turns. Space drops. A finished sit deals again."
          : "Two models sit. Pick a different book for each well. A finished sit deals again."}
      </p>
      {over ? (
        <p className="wait-result">{line}</p>
      ) : (
        <p className="wait-result">A clear sends at most two. The pot stays on Classic.</p>
      )}
      <p className="wait-learn">
        Open stack sat {book.pieces} locks · {book.userPieces} from seats · best {book.bestLines} lines
      </p>
      <div className="wait-tools">
        <HouseButton onClick={deal}>
          New stack
        </HouseButton>
        {mode === "sit" ? (
          <>
            <button className="wait-pad" type="button" {...holdPad(() => startRun(-1), stopRun)}>
              Left
            </button>
            <button
              className="wait-pad"
              type="button"
              onClick={() => playYou((state) => rotate(state, 1))}
            >
              Turn
            </button>
            <button className="wait-pad" type="button" {...holdPad(() => startRun(1), stopRun)}>
              Right
            </button>
            <button className="wait-pad" type="button" {...holdPad(startSoft, stopSoft)}>
              Down
            </button>
            <button
              className="wait-pad"
              type="button"
              onClick={() => playYou((state) => hardDrop(state, youRng.current))}
            >
              Drop
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
