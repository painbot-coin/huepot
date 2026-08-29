"use client";

import {
  IconBolt,
  IconCash,
  IconCoin,
  IconJoin,
  IconMute,
  IconTable,
  IconUsers,
} from "@/components/Icons";
import { colorById, type ColorId } from "@/lib/colors";
import { formatUsdt } from "@/lib/money";
import type { PublicSeat } from "@/lib/types";

export function PlayerBoard({
  seats,
  buttonIds,
  host,
  onMute,
}: {
  seats: PublicSeat[];
  buttonIds: ColorId[];
  host?: boolean;
  onMute?: (userId: string) => void;
}) {
  return (
    <section className="player-board">
      <div className="player-board-head">
        <IconTable />
        <span>
          <IconUsers /> {seats.length}
        </span>
      </div>
      <div className="player-board-scroll">
        <table>
          <thead>
            <tr>
              <th aria-label="Player">
                <IconJoin />
              </th>
              <th aria-label="Bank">
                <IconCash />
              </th>
              <th aria-label="Clicks">
                <IconCoin />
              </th>
              {buttonIds.map((id) => {
                const color = colorById(id);
                return (
                  <th key={id} title={color.name}>
                    <i className="pit-dot" style={{ background: color.hex }} />
                  </th>
                );
              })}
              <th aria-label="If take">
                <IconBolt />
              </th>
            </tr>
          </thead>
          <tbody>
            {seats.map((seat) => (
              <tr className={seat.you ? "is-you" : ""} key={seat.userId}>
                <td>
                  @{seat.username}
                  {seat.you ? " · you" : ""}
                  {host && !seat.you && onMute ? (
                    <button
                      aria-label={`Mute @${seat.username}`}
                      className="pit-mute"
                      onClick={() => onMute(seat.userId)}
                      type="button"
                    >
                      <IconMute />
                    </button>
                  ) : null}
                </td>
                <td>{seat.you ? formatUsdt(seat.balance) : "—"}</td>
                <td>{seat.totalClicks}</td>
                {buttonIds.map((id) => (
                  <td key={id}>{seat.clicks[id] || 0}</td>
                ))}
                <td>{seat.estimated > 0 ? formatUsdt(seat.estimated) : "—"}</td>
              </tr>
            ))}
            {seats.length === 0 ? (
              <tr>
                <td colSpan={4 + buttonIds.length}>Nobody seated.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
