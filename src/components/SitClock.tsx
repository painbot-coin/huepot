"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/money";

const KEY = "huepot-sit";
const IDLE_MS = 30 * 60 * 1000;

export function SitClock() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    function readStart() {
      try {
        const raw = window.localStorage.getItem(KEY);
        const parsed = raw ? (JSON.parse(raw) as { start: number; ping: number }) : null;
        const now = Date.now();
        if (!parsed || now - parsed.ping > IDLE_MS) {
          const next = { start: now, ping: now };
          window.localStorage.setItem(KEY, JSON.stringify(next));
          return next.start;
        }
        window.localStorage.setItem(KEY, JSON.stringify({ start: parsed.start, ping: now }));
        return parsed.start;
      } catch {
        return Date.now();
      }
    }
    const start = readStart();
    const tick = window.setInterval(() => {
      setElapsed(Date.now() - start);
      try {
        const raw = window.localStorage.getItem(KEY);
        const parsed = raw ? (JSON.parse(raw) as { start: number }) : { start };
        window.localStorage.setItem(KEY, JSON.stringify({ start: parsed.start, ping: Date.now() }));
      } catch {
        /* ignore */
      }
    }, 1000);
    setElapsed(Date.now() - start);
    return () => window.clearInterval(tick);
  }, []);

  if (elapsed < 15_000) return null;
  return (
    <span className="nav-sit" title="Time on Huepot this session">
      Sit {formatClock(elapsed)}
    </span>
  );
}
