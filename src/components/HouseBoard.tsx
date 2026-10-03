"use client";

import Link from "next/link";
import { useState } from "react";
import { BoardRowDoors } from "@/components/BoardRowDoors";
import { HouseButton, PageHead } from "@/components/HouseUi";
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
    <div>
      <PageHead
        lead={`HUE is standing from real play. ${hueRule()} Takes are public. The bank stays private.`}
        title="Who sat"
      />
      <div className="board-tabs">
        <HouseButton ghost={tab !== "book"} onClick={() => setTab("book")}>
          The book
        </HouseButton>
        <HouseButton ghost={tab !== "week"} onClick={() => setTab("week")}>
          This week
        </HouseButton>
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
                    {seat.takes} {seat.takes === 1 ? "win" : "wins"} ·{" "}
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
              ? "Nobody played this UTC week yet. "
              : "The book starts when someone sits. "}
            <Link className="underline" href={COMPANY_CLASSIC_HREF}>
              {sitClassicLabel()}
            </Link>
            .
          </li>
        ) : null}
      </ul>
    </div>
  );
}
