"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { IconCash, IconClock, IconCoin, IconPlus, IconPot } from "@/components/Icons";
import { MiniCoin } from "@/components/MiniCoin";
import { PublicPayouts } from "@/components/PublicPayouts";
import { PublicTakes } from "@/components/PublicTakes";
import { RoomMark } from "@/components/RoomMark";
import { SearchDock } from "@/components/SearchDock";
import { colorsForCount } from "@/lib/colors";
import { eventSoon, hallClass, hallFor } from "@/lib/hall";
import { BASIC_ROOMS } from "@/lib/rooms";
import { classicHourClock } from "@/lib/classic-hour";
import { fogCupClock } from "@/lib/fog-cup";
import { inviteText } from "@/lib/invite-copy";
import { formatClock, formatUsdt, formatWait } from "@/lib/money";
import type { ClassicHour, FogCup, LobbyState, PublicRoomCard } from "@/lib/types";

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
  // Same fact as "empty", but it tells a first-time visitor what is available
  // rather than passing a verdict on the house six cards in a row.
  return "seats open";
}

function prefetchTable() {
  void import("@/components/GameClient");
}

function ClassicLine({ rooms }: { rooms: PublicRoomCard[] }) {
  const classic = rooms.find((room) => room.slug === "classic");
  const names = classic?.sitting ?? [];
  if (names.length) {
    return (
      <p>
        <Link href="/rooms/classic" onFocus={prefetchTable} onMouseEnter={prefetchTable}>
          Classic
        </Link>
        {` is sat · ${names.map((name) => `@${name}`).join(" · ")}`}
      </p>
    );
  }
  return (
    <p>
      <Link href="/rooms/classic" onFocus={prefetchTable} onMouseEnter={prefetchTable}>
        Classic
      </Link>{" "}
      is the public pit.
    </p>
  );
}

function ClassicHourLine({ hour, now }: { hour?: ClassicHour; now: number }) {
  if (!hour) return null;
  if (hour.live) {
    return (
      <p className="lobby-hour">
        <Link href="/rooms/classic" onFocus={prefetchTable} onMouseEnter={prefetchTable}>
          Classic hour
        </Link>{" "}
        is on · sit now
      </p>
    );
  }
  return (
    <p className="lobby-hour">
      Next hour {classicHourClock(hour.hour)} · in {formatWait(hour.startAt - now)}
    </p>
  );
}

function FogCupLine({ cup, now }: { cup?: FogCup; now: number }) {
  if (!cup) return null;
  if (cup.live) {
    return (
      <p className="lobby-hour">
        <Link href="/rooms/fog" onFocus={prefetchTable} onMouseEnter={prefetchTable}>
          Fog cup
        </Link>{" "}
        is on · sit Fog
      </p>
    );
  }
  return (
    <p className="lobby-hour">
      Next Fog cup {fogCupClock(cup.weekday, cup.hour)} · in {formatWait(cup.startAt - now)}
    </p>
  );
}

function ClassicInvite({
  code,
  hour,
  cup,
}: {
  code: string;
  hour?: number;
  cup?: FogCup;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const url = `${window.location.origin}/rooms/classic?ref=${code}`;
    const text = inviteText(url, { hour, cup });
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
        <p>Opening the hall…</p>
      </div>
    );
  }

  const basic = state?.rooms.filter((room) => room.kind === "basic") ?? [];
  const custom = state?.rooms.filter((room) => room.kind === "custom") ?? [];
  const hourLive = Boolean(state?.classicHour?.live);
  const cupLive = Boolean(state?.fogCup?.live);
  const hourSoon = Boolean(state?.classicHour && eventSoon(state.classicHour.startAt, now));
  const cupSoon = Boolean(state?.fogCup && eventSoon(state.fogCup.startAt, now));

  return (
    <div className="lobby-stage">
      <header
        className={`lobby-hero${hourLive ? " is-hour" : ""}${cupLive ? " is-cup" : ""}${
          !hourLive && !cupLive && (hourSoon || cupSoon) ? " is-soon" : ""
        }`}
      >
        <div className="lobby-hero-art">
          <BrandMark className="brand-mark is-hero" />
        </div>
        <p className="lobby-kicker">The hall</p>
        <h1 className="font-display">Same price. Biggest color takes.</h1>
        <p className="lobby-rule">
          Every coin costs the same. When the clock ends, the color with the most
          clicks splits the rest of the pot. Ties come back.
        </p>
        <ClassicHourLine hour={state?.classicHour} now={now} />
        <FogCupLine cup={state?.fogCup} now={now} />
        <ClassicLine rooms={basic} />
        <div className="lobby-hero-tools">
          <Link
            className="chip-btn"
            href="/rooms/classic"
            onFocus={prefetchTable}
            onMouseEnter={prefetchTable}
          >
            {hourLive ? "Sit Classic now" : "Sit Classic"}
          </Link>
          {cupLive ? (
            <Link
              className="chip-btn"
              href="/rooms/fog"
              onFocus={prefetchTable}
              onMouseEnter={prefetchTable}
            >
              Sit Fog now
            </Link>
          ) : null}
          {state?.user?.inviteCode ? (
            <ClassicInvite
              code={state.user.inviteCode}
              cup={state.fogCup}
              hour={state.classicHour?.hour}
            />
          ) : (
            <Link className="nav-link" href="/how-it-works">
              Rite
            </Link>
          )}
          <Link aria-label="Raise a table" className="pit-create" href="/rooms/new">
            <IconPlus />
          </Link>
        </div>
        <div className="lobby-search">
          <SearchDock onPickRoom={(slug) => router.push(`/rooms/${slug}`)} />
        </div>
      </header>
      {error ? <p className="error-toast">{error}</p> : null}

      <section>
        <h2 className="lobby-label">House pits</h2>
        <div className="lobby-grid">
          {basic.map((room) => (
            <RoomCard
              key={room.slug}
              now={now}
              room={room}
              blurb={blurbFor(room)}
              hourOn={room.slug === "classic" && hourLive}
              hourSoon={room.slug === "classic" && hourSoon}
              cupOn={room.slug === "fog" && cupLive}
              cupSoon={room.slug === "fog" && cupSoon}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="lobby-row">
          <h2 className="lobby-label">Guest tables</h2>
        </div>
        {custom.length === 0 ? (
          <p className="lobby-empty">No guest tables yet. Open one from the hall.</p>
        ) : (
          <div className="lobby-grid">
            {custom.map((room) => (
              <RoomCard key={room.slug} now={now} room={room} blurb={blurbFor(room)} />
            ))}
          </div>
        )}
      </section>
      <PublicTakes />
      <PublicPayouts />
    </div>
  );
}

function RoomCard({
  room,
  blurb,
  now,
  hourOn,
  hourSoon,
  cupOn,
  cupSoon,
}: {
  room: PublicRoomCard;
  blurb: string;
  now: number;
  hourOn?: boolean;
  hourSoon?: boolean;
  cupOn?: boolean;
  cupSoon?: boolean;
}) {
  const eventKicker = hourOn
    ? "Hour is on"
    : cupOn
      ? "Cup is on"
      : hourSoon
        ? "Hour soon"
        : cupSoon
          ? "Cup soon"
          : null;
  return (
    <Link
      className={`room-card ${hallClass(room.slug)}${hourOn ? " is-hour" : ""}${
        cupOn ? " is-cup" : ""
      }${hourSoon || cupSoon ? " is-soon" : ""}`}
      href={`/rooms/${room.slug}`}
      onFocus={prefetchTable}
      onMouseEnter={prefetchTable}
    >
      <div className="room-card-art">
        <RoomMark fog={Boolean(room.fogSeconds)} slug={room.slug} />
        <div>
          <div className="room-card-top">
            <strong>
              {room.name}
              {room.fogSeconds ? <em className="fog-chip">Fog</em> : null}
            </strong>
            <em className={`pit-kind is-${room.kind}`} title={room.kind === "basic" ? "House" : "Custom"} />
          </div>
          <p className="hall-kicker">
            {eventKicker ?? hallFor(room.slug)?.kicker ?? "Guest table"}
          </p>
          <p>{hallFor(room.slug)?.enter ?? blurb}</p>
        </div>
      </div>
      <div className="room-coin-row" aria-hidden="true">
        {colorsForCount(room.buttonCount).map((color) => (
          <MiniCoin id={color.id} key={color.id} />
        ))}
      </div>
      <dl>
        <div>
          <dt>
            <IconCoin /> Coins
          </dt>
          <dd>{room.buttonCount}</dd>
        </div>
        <div>
          <dt>
            <IconCash /> Click
          </dt>
          <dd>{formatUsdt(room.clickPrice)}</dd>
        </div>
        <div>
          <dt>
            <IconClock /> Round
          </dt>
          <dd>{room.roundSeconds}s</dd>
        </div>
        <div>
          <dt>
            <IconPot /> Pot
          </dt>
          <dd>{formatUsdt(room.pot)}</dd>
        </div>
      </dl>
      <p className="room-card-foot">
        #{room.roundNumber || 1} · {sittingLine(room)}
        {` · ${room.paused ? "paused" : room.status}`}
        {room.closesAt ? ` · ${formatClock(room.closesAt - now)}` : ""}
      </p>
    </Link>
  );
}
