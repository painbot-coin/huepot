"use client";

import { useEffect, useRef, useState } from "react";
import { AimClient } from "@/components/AimClient";
import { BreakClient } from "@/components/BreakClient";
import { CatchClient } from "@/components/CatchClient";
import { LaneClient } from "@/components/LaneClient";
import { SnakeClient } from "@/components/SnakeClient";
import { TetrisClient } from "@/components/TetrisClient";
import { BookAgents, type AgentCard } from "@/components/BookAgents";
import { BookPair, type BookPairFace } from "@/components/BookPair";
import { DeskBank, DeskGoldRoot, useDeskGold } from "@/components/DeskBank";
import { WaitGames } from "@/components/WaitGames";
import { HouseButton } from "@/components/HouseUi";
import { MARK_GAMES, deskKind, liveMarksForKind, sitParam, type MarkKind, type PublicMark } from "@/lib/house-mark-list";

function enterFull(node: HTMLElement) {
  const webkit = node as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
  if (node.requestFullscreen) return node.requestFullscreen();
  return webkit.webkitRequestFullscreen?.();
}

export function WaitDesk({ sit = "", pair = "" }: { sit?: string; pair?: string }) {
  return (
    <DeskGoldRoot>
      <WaitDeskBody pair={pair} sit={sit} />
    </DeskGoldRoot>
  );
}

function WaitDeskBody({ sit = "", pair = "" }: { sit?: string; pair?: string }) {
  const gold = useDeskGold();
  const book = sitParam(sit);
  const deskRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  const [marks, setMarks] = useState<PublicMark[]>([]);
  const [agents, setAgents] = useState<AgentCard[]>([]);
  const [pairFace, setPairFace] = useState<BookPairFace | null>(null);
  const [game, setGame] = useState<MarkKind>(book ? deskKind(book) : "wait");

  useEffect(() => {
    if (!book) return;
    setGame(deskKind(book));
  }, [book]);

  useEffect(() => {
    const onChange = () => setWide(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    let live = true;
    void fetch(pair ? `/api/wait/marks?pair=${encodeURIComponent(pair)}` : "/api/wait/marks")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { marks?: PublicMark[]; agents?: AgentCard[]; pair?: BookPairFace | null; signedIn?: boolean; balanceCents?: number } | null) => {
        if (!live || !data?.marks) return;
        setMarks(data.marks);
        setAgents(data.agents ?? []);
        setPairFace(data.pair ?? null);
        gold?.setGold({ signedIn: Boolean(data.signedIn), balanceCents: data.balanceCents ?? 0 });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [pair]);

  const picked = MARK_GAMES.find((row) => row.id === game);
  const desk = picked?.desk ?? "stack";

  const goFull = () => {
    const node = deskRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void enterFull(node);
  };

  return (
    <>
    <BookPair pair={pairFace} />
    <BookAgents agents={agents} focusId={book} />
    <div className="wait-desk" ref={deskRef}>
      <div className="wait-play">
        <div className="wait-play-bar">
          <DeskBank />
          <HouseButton className="wait-full" onClick={goFull}>
            {wide ? "Leave full" : "Full screen"}
          </HouseButton>
        </div>
        {desk === "catch" ? (
          <CatchClient marks={liveMarksForKind("catch", marks)} sit={book} />
        ) : desk === "snake" ? (
          <SnakeClient marks={liveMarksForKind("snake", marks)} sit={book} />
        ) : desk === "aim" ? (
          <AimClient marks={liveMarksForKind("aim", marks)} sit={book} />
        ) : desk === "lane" ? (
          <LaneClient marks={liveMarksForKind("lane", marks)} sit={book} />
        ) : desk === "break" ? (
          <BreakClient marks={liveMarksForKind("break", marks)} sit={book} />
        ) : desk === "stack" ? (
          <TetrisClient marks={liveMarksForKind("wait", marks)} sit={book} />
        ) : (
          <div className="wait-soon">
            <p className="hall-kicker">{picked?.title || "Games"}</p>
            <p>{picked?.how || "This game is not on the table yet."}</p>
          </div>
        )}
      </div>
      <WaitGames selected={game} onPick={setGame} />
    </div>
    </>
  );
}
