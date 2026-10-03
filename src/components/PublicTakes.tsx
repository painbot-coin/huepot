"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconPot } from "@/components/Icons";
import { MiniCoin } from "@/components/MiniCoin";
import { classicHourClock, classicHourUtc } from "@/lib/classic-hour";
import { formatUsdt } from "@/lib/money";
import { sitDoorLabel } from "@/lib/take-copy";
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

function prefetchTable() {
  void import("@/components/GameClient");
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
          A take lands when one color beats another.{" "}
          <Link href="/rooms/classic">Play Classic {classicHourClock(classicHourUtc())}</Link>
          .
        </p>
      ) : (
        <ul>
          {takes.map((item) => (
            <li key={item.id}>
              <Link
                className="take-sit"
                href={`/rooms/${item.slug}`}
                onFocus={prefetchTable}
                onMouseEnter={prefetchTable}
              >
                <span className="take-coins" aria-hidden="true">
                  {(item.winners ?? []).map((id) => (
                    <MiniCoin id={id} key={id} size={14} />
                  ))}
                </span>
                <strong>{item.names}</strong>
                took {formatUsdt(item.amount)}
                <em>{sitDoorLabel(item.slug, item.roomName)}</em>
                <span>{ageLabel(item.at, now)}</span>
              </Link>
              <Link className="take-open" href={`/take/${item.id}`}>
                Take
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
