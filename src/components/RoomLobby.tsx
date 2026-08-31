"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconPlus } from "@/components/Icons";
import { PublicPayouts } from "@/components/PublicPayouts";
import { SearchDock } from "@/components/SearchDock";
import { BASIC_ROOMS } from "@/lib/rooms";
import { classicHourClock } from "@/lib/classic-hour";
import { formatClock, formatUsdt, formatWait } from "@/lib/money";
import type { ClassicHour, LobbyState, PublicRoomCard } from "@/lib/types";

function blurbFor(room: PublicRoomCard) {
  const base =
    BASIC_ROOMS.find((item) => item.slug === room.slug)?.blurb ??
    `${room.buttonCount} coins · ${room.roundSeconds}s`;
  if (room.kind === "custom" && room.fogSeconds) {
    return `${base} Last ${room.fogSeconds}s, the board goes dark.`;
  }
  return base;
}

function sittingLine(room: PublicRoomCard) {
  const names = room.sitting ?? [];
  if (names.length) return names.map((name) => `@${name}`).join(" · ");
  if (room.players) return `${room.players} sitting`;
  return "empty";
}

function ClassicLine({ rooms }: { rooms: PublicRoomCard[] }) {
  const classic = rooms.find((room) => room.slug === "classic");
  const names = classic?.sitting ?? [];
  if (names.length) {
    return (
      <p>
        <Link href="/rooms/classic">Classic</Link>
        {` is sat · ${names.map((name) => `@${name}`).join(" · ")}`}
      </p>
    );
  }
  return (
    <p>
      <Link href="/rooms/classic">Classic</Link> is the public pit.
    </p>
  );
}

function ClassicHourLine({ hour, now }: { hour?: ClassicHour; now: number }) {
  if (!hour) return null;
  if (hour.live) {
    return (
      <p className="lobby-hour">
        <Link href="/rooms/classic">Classic hour</Link> is on · sit now
      </p>
    );
  }
  return (
    <p className="lobby-hour">
      Next hour {classicHourClock(hour.hour)} · in {formatWait(hour.startAt - now)}
    </p>
  );
}

function ClassicInvite({ code, hour }: { code: string; hour?: number }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const url = `${window.location.origin}/rooms/classic?ref=${code}`;
    const when = hour != null ? `Classic sits ${classicHourClock(hour)}. ` : "";
    const text = `${when}Sign in with this link. If you sit, I get a slice of the house take only — not your bank.\n${url}`;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <button className="chip-btn lobby-invite" onClick={copy} type="button">
      {copied ? "Invite copied" : "Copy Classic invite"}
    </button>
  );
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
        <ClassicLine rooms={basic} />
        <ClassicHourLine hour={state?.classicHour} now={now} />
        <div className="lobby-hero-tools">
          <SearchDock onPickRoom={(slug) => router.push(`/rooms/${slug}`)} />
          {state?.user?.inviteCode ? (
            <ClassicInvite code={state.user.inviteCode} hour={state.classicHour?.hour} />
          ) : null}
          <Link aria-label="Create room" className="pit-create" href="/rooms/new">
            <IconPlus />
          </Link>
        </div>
      </header>
      <PublicPayouts />
      {error ? <p className="error-toast">{error}</p> : null}

      <section>
        <h2 className="lobby-label">House</h2>
        <div className="lobby-grid">
          {basic.map((room) => (
            <RoomCard
              key={room.slug}
              now={now}
              room={room}
              blurb={blurbFor(room)}
              hourOn={room.slug === "classic" && Boolean(state?.classicHour?.live)}
            />
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
  hourOn,
}: {
  room: PublicRoomCard;
  blurb: string;
  now: number;
  hourOn?: boolean;
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
        #{room.roundNumber || 1} · {sittingLine(room)}
        {` · ${room.paused ? "paused" : room.status}`}
        {hourOn ? " · hour on" : ""}
        {room.closesAt ? ` · ${formatClock(room.closesAt - now)}` : ""}
      </p>
    </Link>
  );
}
