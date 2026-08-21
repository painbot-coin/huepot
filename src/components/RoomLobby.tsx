"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BASIC_ROOMS } from "@/lib/rooms";
import { formatUsdt } from "@/lib/money";
import type { LobbyState, PublicRoomCard } from "@/lib/types";

function blurbFor(room: PublicRoomCard) {
  return BASIC_ROOMS.find((item) => item.slug === room.slug)?.blurb
    ?? `Custom table · ${room.buttonCount} coins · ${room.roundSeconds}s rounds.`;
}

export function RoomLobby() {
  const [state, setState] = useState<LobbyState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch("/api/rooms");
        const data = (await response.json()) as LobbyState & { error?: string };
        if (!response.ok) throw new Error(data.error || "Could not load rooms");
        if (alive) {
          setState(data);
          setError("");
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Could not load rooms");
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 2500);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  if (!state && !error) {
    return (
      <div className="loader-stage">
        <div className="loader-ring" />
        <p>Opening the rooms…</p>
      </div>
    );
  }

  const basic = state?.rooms.filter((room) => room.kind === "basic") ?? [];
  const custom = state?.rooms.filter((room) => room.kind === "custom") ?? [];

  return (
    <div className="lobby-stage">
      <header className="lobby-hero">
        <p className="lobby-kicker">Huepot rooms</p>
        <h1 className="font-display">Pick a table. Chat the pit.</h1>
        <p>
          Basic rooms are free to open — no table fee. Make your own with coin
          count, click price, and round time. Each room has its own feed for
          chat, takes, and wager earnings.
        </p>
        <Link className="chip-btn" href="/rooms/new">
          Create a room
        </Link>
      </header>
      {error ? <p className="error-toast">{error}</p> : null}

      <section>
        <h2 className="lobby-label">Basic rooms</h2>
        <div className="lobby-grid">
          {basic.map((room) => (
            <RoomCard key={room.slug} room={room} blurb={blurbFor(room)} />
          ))}
        </div>
      </section>

      <section>
        <div className="lobby-row">
          <h2 className="lobby-label">Custom rooms</h2>
          <Link className="nav-link" href="/rooms/new">
            New table
          </Link>
        </div>
        {custom.length === 0 ? (
          <p className="lobby-empty">No custom tables yet. Open one — no create fee.</p>
        ) : (
          <div className="lobby-grid">
            {custom.map((room) => (
              <RoomCard key={room.slug} room={room} blurb={blurbFor(room)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RoomCard({ room, blurb }: { room: PublicRoomCard; blurb: string }) {
  return (
    <Link className="room-card" href={`/rooms/${room.slug}`}>
      <div className="room-card-top">
        <strong>{room.name}</strong>
        <span>{room.kind === "basic" ? "No fee" : "Custom"}</span>
      </div>
      <p>{blurb}</p>
      <dl>
        <div>
          <dt>Coins</dt>
          <dd>{room.buttonCount}</dd>
        </div>
        <div>
          <dt>Click</dt>
          <dd>{formatUsdt(room.clickPrice)}</dd>
        </div>
        <div>
          <dt>Round</dt>
          <dd>{room.roundSeconds}s</dd>
        </div>
        <div>
          <dt>Pot</dt>
          <dd>{formatUsdt(room.pot)}</dd>
        </div>
      </dl>
      <p className="room-card-foot">
        Round #{room.roundNumber || 1} · {room.players} seated · {room.status}
      </p>
    </Link>
  );
}
