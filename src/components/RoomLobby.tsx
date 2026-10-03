"use client";
import { HouseButton } from "@/components/HouseUi";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HouseFloor, floorYou } from "@/components/HouseFloor";
import { IconCash, IconClock, IconCoin, IconPlus, IconPot } from "@/components/Icons";
import { MiniCoin } from "@/components/MiniCoin";
import { PublicBoard } from "@/components/PublicBoard";
import { PublicPayouts } from "@/components/PublicPayouts";
import { PublicTakes } from "@/components/PublicTakes";
import { RoomMark } from "@/components/RoomMark";
import { colorsForCount } from "@/lib/colors";
import { CircleRooms } from "@/components/CircleRooms";
import { EveningWalk, useEveningBook } from "@/components/EveningWalk";
import { useCopy } from "@/components/LocaleRoot";
import { eveningBookHref, eveningBookName } from "@/lib/evening-path";
import { spokenDoors } from "@/lib/house-tongue";
import { eventSoon, hallClass, hallFor } from "@/lib/hall";
import { BASIC_ROOMS } from "@/lib/rooms";
import { CopyInvite } from "@/components/CopyInvite";
import {
  FIRST_SIT_LINE,
  classicWaitingFirstSit,
  firstSitCta,
  hallLiveDoor,
} from "@/lib/classic-sit";
import { classicHourLine, classicHourSitLabel, fogCupLine, nightHourLine, tableClockMark } from "@/lib/hour-door";
import { jobSeatLabel, listHouseJobs } from "@/lib/house-jobs";
import { pitLabel } from "@/lib/seat-alike";
import { formatClock, formatUsdt } from "@/lib/money";
import { groupCompanySits } from "@/lib/sit-pulse";
import type { ClassicHour, CompanySit, FogCup, HallHome, LobbyState, NightHour, PublicRoomCard } from "@/lib/types";

type HallShelf = "pits" | "live" | "tape" | "work";

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
  if (room.players) return `${room.players} playing`;
  // Same fact as "empty", but it tells a first-time visitor what is available
  // rather than passing a verdict on the house six cards in a row.
  if (classicWaitingFirstSit(room)) return "waiting for the first player";
  return "open";
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
        {` is live · ${names.map((name) => `@${name}`).join(" · ")}`}
      </p>
    );
  }
  return (
    <p>
      <Link href="/rooms/classic" onFocus={prefetchTable} onMouseEnter={prefetchTable}>
      Classic
        </Link>{" "}
      is waiting for the first player.
    </p>
  );
}

function CompanyLine({ sits }: { sits: CompanySit[] }) {
  const groups = groupCompanySits(sits);
  if (!groups.length) return null;
  return (
    <p className="lobby-hour">
      Friends
      {groups.map((group, index) => {
        const names = group.usernames.map((name) => `@${name}`).join(" · ");
        const verb =
          groups.length === 1
            ? group.usernames.length === 1
              ? " is on "
              : " are on "
            : " on ";
        return (
          <span key={group.slug}>
            {index === 0 ? " · " : " · "}
            {names}
            {verb}
            <Link
              href={`/rooms/${group.slug}`}
              onFocus={prefetchTable}
              onMouseEnter={prefetchTable}
            >
              {group.label}
            </Link>
          </span>
        );
      })}
    </p>
  );
}

function ClassicHourLine({ hour, now }: { hour?: ClassicHour; now: number }) {
  if (!hour) return null;
  const line = classicHourLine(hour, now);
  return (
    <p className="lobby-hour">
      <Link href={line.href} onFocus={prefetchTable} onMouseEnter={prefetchTable}>
        {line.text}
      </Link>
    </p>
  );
}

function FogCupLine({ cup, now }: { cup?: FogCup; now: number }) {
  if (!cup) return null;
  const line = fogCupLine(cup, now);
  return (
    <p className="lobby-hour">
      <Link href={line.href} onFocus={prefetchTable} onMouseEnter={prefetchTable}>
        {line.text}
      </Link>
    </p>
  );
}

function NightHourLine({ hour, now }: { hour?: NightHour; now: number }) {
  if (!hour) return null;
  const line = nightHourLine(hour, now);
  return (
    <p className="lobby-hour">
      <Link href={line.href} onFocus={prefetchTable} onMouseEnter={prefetchTable}>
        {line.text}
      </Link>
    </p>
  );
}

export function RoomLobby() {
  const { locale } = useCopy();
  const book = useEveningBook();
  const [state, setState] = useState<LobbyState | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [shelf, setShelf] = useState<HallShelf>("pits");

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
      <HouseFloor kicker="Home">
        <div className="loader-stage">
          <div className="loader-ring" />
          <p>Opening home…</p>
        </div>
      </HouseFloor>
    );
  }

  const basic = state?.rooms.filter((room) => room.kind === "basic") ?? [];
  const custom = state?.rooms.filter((room) => room.kind === "custom") ?? [];
  const hourLive = Boolean(state?.classicHour?.live);
  const nightLive = Boolean(state?.nightHour?.live);
  const cupLive = Boolean(state?.fogCup?.live);
  const hourSoon = Boolean(state?.classicHour && eventSoon(state.classicHour.startAt, now));
  const nightSoon = Boolean(state?.nightHour && eventSoon(state.nightHour.startAt, now));
  const cupSoon = Boolean(state?.fogCup && eventSoon(state.fogCup.startAt, now));
  const liveRooms = [...basic, ...custom].filter((room) =>
    hallLiveDoor(room, { nightLive, cupLive }),
  );
  const featured =
    (cupLive && basic.find((room) => room.slug === "fog")) ||
    (nightLive && basic.find((room) => room.slug === "night")) ||
    (hourLive && basic.find((room) => room.slug === "classic")) ||
    (state?.hallHome?.lastPit &&
      [...basic, ...custom].find((room) => room.slug === state.hallHome?.lastPit?.slug)) ||
    basic.find((room) => room.slug === "classic") ||
    basic[0] ||
    null;
  const jobs = listHouseJobs();
  const pitCards = (shelf === "live" ? liveRooms : [...basic, ...custom]).map((room) => (
    <RoomCard
      key={room.slug}
      now={now}
      room={room}
      blurb={blurbFor(room)}
      hourOn={(room.slug === "classic" && hourLive) || (room.slug === "night" && nightLive)}
      hourSoon={(room.slug === "classic" && hourSoon) || (room.slug === "night" && nightSoon)}
      cupOn={room.slug === "fog" && cupLive}
      cupSoon={room.slug === "fog" && cupSoon}
      clock={tableClockMark(
        room.slug,
        state?.classicHour,
        state?.nightHour,
        state?.fogCup,
        now,
      )}
    />
  ));

  return (
    <HouseFloor
      kicker="Home"
      side={<HallSide home={state?.hallHome ?? null} jobs={jobs} user={state?.user?.username} />}
      you={floorYou(state?.user)}
    >
      {error ? <p className="error-toast">{error}</p> : null}
      <nav aria-label="Ways in" className="hall-doors">
        {spokenDoors(locale).map((door) => {
          const back = door.id === "book" && book;
          return (
            <Link
              className="li-card hall-door"
              href={back ? eveningBookHref(book) : door.href}
              key={door.id}
            >
              <strong>{door.title}</strong>
              <span>{back ? eveningBookName(book) : door.line}</span>
            </Link>
          );
        })}
      </nav>
      <EveningWalk />
      <CircleRooms signedIn={Boolean(state?.user)} />
      {featured ? (
        <FeaturedPit
          cup={state?.fogCup}
          hour={state?.classicHour}
          night={state?.nightHour}
          now={now}
          room={featured}
          user={state?.user}
        />
      ) : null}
      <div className="hall-hour-lines">
        <ClassicHourLine hour={state?.classicHour} now={now} />
        <NightHourLine hour={state?.nightHour} now={now} />
        <FogCupLine cup={state?.fogCup} now={now} />
        <CompanyLine sits={state?.companySitting ?? []} />
        <ClassicLine rooms={basic} />
      </div>
      <nav aria-label="Home filters" className="hall-filters">
        {(
          [
            ["pits", "Tables"],
            ["live", "Live"],
            ["tape", "Activity"],
            ["work", "Jobs"],
          ] as const
        ).map(([id, label]) => (
          <button
            className={shelf === id ? "is-on" : ""}
            key={id}
            onClick={() => setShelf(id)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>
      {shelf === "work" ? (
        <section>
          <div className="lobby-row">
            <h2 className="lobby-label">Jobs</h2>
            <Link className="nav-link" href="/jobs">
              All jobs
            </Link>
          </div>
          <div className="house-posts-hall">
            {jobs.map((job) => (
              <Link className="li-card house-post-hall" href={`/jobs/${job.id}`} key={job.id}>
                <strong>{job.title}</strong>
                <em>{job.need}</em>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {shelf === "tape" ? (
        <>
          <PublicTakes />
          <PublicPayouts />
          <PublicBoard />
        </>
      ) : null}
      {shelf === "pits" || shelf === "live" ? (
        <section>
          <div className="lobby-row">
            <h2 className="lobby-label">{shelf === "live" ? "Live tables" : "Tables"}</h2>
            <Link aria-label="Raise a table" className="pit-create" href="/rooms/new">
              <IconPlus />
            </Link>
          </div>
          {pitCards.length ? (
            <div className="lobby-grid">{pitCards}</div>
          ) : (
            <p className="account-empty">
              No live table right now.{" "}
              <Link href="/rooms/classic">Play Classic</Link> is the public table.
            </p>
          )}
        </section>
      ) : null}
      {shelf === "pits" ? <PublicTakes /> : null}
    </HouseFloor>
  );
}

function FeaturedPit({
  room,
  now,
  hour,
  night,
  cup,
  user,
}: {
  room: PublicRoomCard;
  now: number;
  hour?: ClassicHour;
  night?: NightHour;
  cup?: FogCup;
  user?: LobbyState["user"];
}) {
  return (
    <section className={`li-card hall-featured ${hallClass(room.slug)}`}>
      <RoomMark fog={Boolean(room.fogSeconds)} slug={room.slug} />
      <div>
        <p className="hall-kicker">{hallFor(room.slug)?.kicker ?? "Featured table"}</p>
        <h1>{room.name}</h1>
        <p>
          {classicWaitingFirstSit(room)
            ? FIRST_SIT_LINE
            : hallFor(room.slug)?.enter ?? blurbFor(room)}
        </p>
        <dl className="hall-featured-stats">
          <div>
            <dt>Pot</dt>
            <dd>{formatUsdt(room.pot)} USDT</dd>
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
            <dt>Now</dt>
            <dd>{sittingLine(room)}</dd>
          </div>
        </dl>
        <p className="guide-cta">
          <HouseButton href={`/rooms/${room.slug}`}>
            {classicWaitingFirstSit(room)
              ? firstSitCta(Boolean(user), Boolean(user?.bonus))
              : user?.bonus && room.slug === "classic"
                ? "Play credit · Classic"
                : `Play ${room.name}`}
          </HouseButton>
          {room.slug !== "classic" ? (
            <HouseButton ghost href="/rooms/classic">
              {classicHourSitLabel(hour, now)}
            </HouseButton>
          ) : null}
          {user?.inviteCode ? (
            <CopyInvite
              className="chip-btn chip-btn-ghost"
              code={user.inviteCode}
              cup={cup}
              hour={hour?.hour}
              href="/rooms/classic"
              label="Copy invite"
              night={night?.hour}
            />
          ) : (
            <Link className="nav-link" href="/signin?next=/rooms/classic">
              Sign in to play
            </Link>
          )}
        </p>
      </div>
    </section>
  );
}

function HallSide({
  home,
  jobs,
  user,
}: {
  home: HallHome | null;
  jobs: ReturnType<typeof listHouseJobs>;
  user?: string;
}) {
  return (
    <>
      <p className="lobby-label">Discover</p>
      {home?.lastPit ? (
        <Link className="account-side-stat" href={`/rooms/${home.lastPit.slug}`}>
          <strong>{home.lastPit.sitting ? "You're playing" : "Your table"}</strong>
          <em>{pitLabel(home.lastPit.slug)}</em>
        </Link>
      ) : null}
      {home?.alike.length ? (
        <ul className="hall-home-alike">
          {home.alike.map((seat) => (
            <li key={seat.username}>
              <Link href={`/network/u/${encodeURIComponent(seat.username)}`}>
                <strong>@{seat.username}</strong>
                <em>{seat.why}</em>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="lobby-label house-rail-label">Jobs</p>
      <ul className="hall-side-posts">
        {jobs.slice(0, 5).map((job) => (
          <li key={job.id}>
            <Link href={`/jobs/${job.id}`}>
              <strong>{job.title}</strong>
              <em>{jobSeatLabel(job.seat)}</em>
            </Link>
          </li>
        ))}
      </ul>
      <div className="li-profile-act">
        <HouseButton ghost href="/jobs">
          All jobs
        </HouseButton>
        <HouseButton ghost href="/network">
          Network
        </HouseButton>
        {user ? (
          <HouseButton ghost href={`/network/u/${encodeURIComponent(user)}`}>
            Profile
          </HouseButton>
        ) : null}
      </div>
    </>
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
  clock,
}: {
  room: PublicRoomCard;
  blurb: string;
  now: number;
  hourOn?: boolean;
  hourSoon?: boolean;
  cupOn?: boolean;
  cupSoon?: boolean;
  clock?: string;
}) {
  const eventKicker = clock || null;
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
