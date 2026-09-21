"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconUsers } from "@/components/Icons";
import { COMPANY_CLASSIC_HREF, sitClassicLabel } from "@/lib/company-door";
import type { HouseSeat } from "@/lib/house-board";

const STRIP = 5;

export function PublicBoard() {
  const [seats, setSeats] = useState<HouseSeat[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch("/api/board");
        const data = (await response.json()) as { seats?: HouseSeat[] };
        if (alive && Array.isArray(data.seats)) setSeats(data.seats);
      } catch {
        /* keep last */
      }
    }
    void load();
    const poll = window.setInterval(() => void load(), 20_000);
    return () => {
      alive = false;
      window.clearInterval(poll);
    };
  }, []);

  const top = seats.slice(0, STRIP);

  return (
    <section className="payout-strip take-strip" aria-label="The board">
      <p className="lobby-label">
        <Link href="/board">The board</Link>
        {" · "}
        <Link href={COMPANY_CLASSIC_HREF}>{sitClassicLabel()}</Link>
      </p>
      {top.length === 0 ? (
        <p className="strip-empty">
          <IconUsers />
          The book starts when someone sits.{" "}
          <Link href="/board">Open the board</Link>.
        </p>
      ) : (
        <ul>
          {top.map((seat) => (
            <li key={seat.username}>
              <Link href={`/network/u/${encodeURIComponent(seat.username)}`}>
                <strong>
                  {seat.place}. @{seat.username}
                </strong>
                {seat.coin.toLocaleString()} HUE
                <span>
                  {seat.takes} {seat.takes === 1 ? "take" : "takes"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
