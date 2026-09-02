"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconPot } from "@/components/Icons";
import { formatUsdt } from "@/lib/money";
import type { PublicTake } from "@/lib/types";

function ageLabel(at: number, now: number) {
  const delta = Math.max(0, now - at);
  const mins = Math.floor(delta / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function PublicTakes() {
  const [takes, setTakes] = useState<PublicTake[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch("/api/takes");
        const data = (await response.json()) as { takes?: PublicTake[] };
        if (alive && Array.isArray(data.takes)) setTakes(data.takes);
      } catch {
        /* keep last */
      }
    }
    void load();
    const poll = window.setInterval(() => void load(), 8_000);
    const tick = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      alive = false;
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, []);

  return (
    <section className="payout-strip take-strip" aria-label="Recent takes">
      <p className="lobby-label">Last takes</p>
      {takes.length === 0 ? (
        <p className="strip-empty">
          <IconPot />
          Takes land here.
        </p>
      ) : (
        <ul>
          {takes.map((item) => (
            <li key={item.id}>
              <Link href={`/take/${item.id}`}>
                <strong>{item.names}</strong>
                {formatUsdt(item.amount)} · {item.roomName}
                <span>{ageLabel(item.at, now)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
