"use client";

import { Avatar } from "@/components/Avatar";
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
  fog = false,
}: {
  seats: PublicSeat[];
  buttonIds: ColorId[];
  host?: boolean;
  onMute?: (userId: string) => void;
  fog?: boolean;
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
            {seats.map((seat) => {
              const veil = fog && !seat.you;
              return (
              <tr className={seat.you ? "is-you" : ""} key={seat.userId}>
                <td>
                  <span className="seat-who">
                    <Avatar avatar={seat.avatar} size="sm" username={seat.username} />
                    @{seat.username}
                  </span>
                  {seat.you ? " Â· you" : ""}
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
                <td>{seat.you ? formatUsdt(seat.balance) : "â€”"}</td>
                <td>{veil ? "Â·" : seat.totalClicks}</td>
                {buttonIds.map((id) => (
                  <td key={id}>{veil ? "Â·" : seat.clicks[id] || 0}</td>
                ))}
                <td>
                  {veil
                    ? "Â·"
                    : seat.estimated > 0
                      ? formatUsdt(seat.estimated)
                      : "â€”"}
                </td>
              </tr>
              );
            })}
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
