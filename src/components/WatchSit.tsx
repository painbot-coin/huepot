"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import type { WatchFrame, WatchSit as WatchSitData } from "@/lib/lab-watch";

const CELL = ["", "is-fill", "is-live", "is-pad", "is-junk"];

function Well({ frame }: { frame: WatchFrame }) {
  return (
    <div
      className={`wait-well is-watch ${frame.cols === 1 ? "is-lane" : ""}`}
      style={{ "--cols": frame.cols, "--rows": frame.rows } as CSSProperties}
    >
      <div className="wait-grid">
        {frame.cells.map((cell, i) => (
          <i key={i} className={CELL[cell] ?? ""} />
        ))}
      </div>
    </div>
  );
}

export function WatchSit({
  sit,
  vault = "",
  vaultLine = "",
}: {
  sit: WatchSitData;
  vault?: string;
  vaultLine?: string;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setTick(0);
    if (sit.frames.length < 2) return;
    const id = window.setInterval(() => {
      setTick((n) => {
        if (n + 1 >= sit.frames.length) {
          window.clearInterval(id);
          return sit.frames.length - 1;
        }
        return n + 1;
      });
    }, 140);
    return () => window.clearInterval(id);
  }, [sit]);
  const frame = sit.frames[Math.min(tick, sit.frames.length - 1)]!;
  return (
    <div className="wait-watch" aria-live="polite">
      <Well frame={frame} />
      <p className="wait-watch-meta">
        {frame.score} · {frame.note}
        {frame.alive ? "" : " · done"}
      </p>
      {vault ? (
        <Link className="wait-pad wait-watch-vault" href={vault}>
          {vaultLine}
        </Link>
      ) : null}
    </div>
  );
}
