"use client";

import Link from "next/link";
import { useState } from "react";
import { BoardRowDoors } from "@/components/BoardRowDoors";
import { hueRule } from "@/lib/coin";
import {
  COMPANY_CLASSIC_HREF,
  sitClassicLabel,
} from "@/lib/company-door";
import type { BoardSitDoor } from "@/lib/board-sit";
import type { HouseSeat } from "@/lib/house-board";
import { formatUsdt } from "@/lib/money";
import type { FogCup } from "@/lib/types";

export function HouseBoard({
  seats,
  week,
  you,
  doors,
  inviteCode,
  hour,
  night,
  cup,
}: {
  seats: HouseSeat[];
  week: HouseSeat[];
  you?: string;
  doors: Record<string, BoardSitDoor>;
  inviteCode?: string;
  hour?: number | null;
  night?: number | null;
  cup?: FogCup | null;
}) {
  const [tab, setTab] = useState<"book" | "week">("book");
  const mine = (you ?? "").toLowerCase();
  const rows = tab === "week" ? week : seats;

  return (
    <main className="app-page is-wide">
      <p className="hall-kicker">The board</p>
      <h1 className="font-display text-4xl text-white">Who sat</h1>
      <p className="app-lead">
        HUE is standing from real play. {hueRule()} Takes are public. The bank
        stays private. A row opens a sit.
      </p>
      <div className="board-tabs">
        <button
          className={`chip-btn${tab === "book" ? "" : " chip-btn-ghost"}`}
          onClick={() => setTab("book")}
          type="button"
        >
          The book
        </button>
        <button
          className={`chip-btn${tab === "week" ? "" : " chip-btn-ghost"}`}
          onClick={() => setTab("week")}
          type="button"
        >
          This week
        </button>
      </div>
      <ul className="ledger-list board-list">
        {rows.map((seat) => {
          const self = Boolean(mine && seat.username.toLowerCase() === mine);
          const door = doors[seat.username];
          return (
            <li className="board-item" key={seat.username}>
              <Link
                className={`ledger-row board-row${self ? " is-you" : ""}`}
                href={`/network/u/${encodeURIComponent(seat.username)}`}
              >
                <span className="board-place">{seat.place}</span>
                <span className="board-who">
                  <strong>@{seat.username}</strong>
                  <em>
                    Level {seat.level} · {seat.title}
                    {self ? " · you" : ""}
                  </em>
                </span>
                <span className="board-mark">
                  <strong>{seat.coin.toLocaleString()} HUE</strong>
                  <em>
                    {seat.takes} {seat.takes === 1 ? "take" : "takes"} ·{" "}
                    {formatUsdt(seat.taken)} USDT
                  </em>
                </span>
              </Link>
              {door ? (
                <BoardRowDoors
                  door={door}
                  invite={
                    self && inviteCode
                      ? { code: inviteCode, hour, night, cup }
                      : null
                  }
                  username={seat.username}
                />
              ) : null}
            </li>
          );
        })}
        {rows.length === 0 ? (
          <li className="empty-note">
            {tab === "week"
              ? "Nobody sat this UTC week yet. "
              : "The book starts when someone sits. "}
            <Link className="underline" href={COMPANY_CLASSIC_HREF}>
              {sitClassicLabel()}
            </Link>
            .
          </li>
        ) : null}
      </ul>
    </main>
  );
}
