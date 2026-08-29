"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconPlus } from "@/components/Icons";
import { SearchDock } from "@/components/SearchDock";
import { BASIC_ROOMS } from "@/lib/rooms";
import { formatClock, formatUsdt } from "@/lib/money";
import type { LobbyState, PublicRoomCard } from "@/lib/types";

function blurbFor(room: PublicRoomCard) {
  const base =
    BASIC_ROOMS.find((item) => item.slug === room.slug)?.blurb ??
    `${room.buttonCount} coins · ${room.roundSeconds}s`;
  if (room.kind === "custom" && room.fogSeconds) {
    return `${base} Last ${room.fogSeconds}s, the board goes dark.`;
  }
  return base;
}

export function RoomLobby() {
  const router = useRouter();
  const [state, setState] = useState<LobbyState | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

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
    const poll = window.setInterval(() => void load(), 2500);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      window.clearInterval(poll);
      window.clearInterval(tick);
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
        <p className="lobby-kicker">Sit. Pick a color. Watch the pot.</p>
        <h1 className="font-display">Huepot tables</h1>
        <p>
          One click is one stake. Biggest color takes the rest. Fog Pit hides
          public counts in the last 12 seconds so the last click is a guess, not
          a pile-on.
        </p>
        <div className="lobby-hero-tools">
          <SearchDock onPickRoom={(slug) => router.push(`/rooms/${slug}`)} />
          <Link aria-label="Create room" className="pit-create" href="/rooms/new">
            <IconPlus />
          </Link>
        </div>
      </header>
      {error ? <p className="error-toast">{error}</p> : null}

      <section>
        <h2 className="lobby-label">House</h2>
        <div className="lobby-grid">
          {basic.map((room) => (
            <RoomCard key={room.slug} now={now} room={room} blurb={blurbFor(room)} />
          ))}
        </div>
      </section>

      <section>
        <div className="lobby-row">
          <h2 className="lobby-label">Open tables</h2>
        </div>
        {custom.length === 0 ? (
          <p className="lobby-empty">No custom tables yet.</p>
        ) : (
          <div className="lobby-grid">
            {custom.map((room) => (
              <RoomCard key={room.slug} now={now} room={room} blurb={blurbFor(room)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RoomCard({
  room,
  blurb,
  now,
}: {
  room: PublicRoomCard;
  blurb: string;
  now: number;
}) {
  return (
    <Link className="room-card" href={`/rooms/${room.slug}`}>
      <div className="room-card-top">
        <strong>
          {room.name}
          {room.fogSeconds ? <em className="fog-chip">Fog</em> : null}
        </strong>
        <em className={`pit-kind is-${room.kind}`} title={room.kind === "basic" ? "House" : "Custom"} />
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
        #{room.roundNumber || 1} · {room.players} · {room.paused ? "paused" : room.status}
        {room.closesAt ? ` · ${formatClock(room.closesAt - now)}` : ""}
      </p>
    </Link>
  );
}
