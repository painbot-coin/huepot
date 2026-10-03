"use client";

import { useEffect, useState } from "react";
import { ManagePeople } from "@/components/ManagePeople";
import type { DeskPerson } from "@/lib/house-people";
import { lastSeen, parseVisitDoor, type DeskTraffic, type VisitDoor, type VisitRoll } from "@/lib/house-traffic";

const DOOR_LABEL: Record<VisitDoor, string> = {
  home: "Home",
  news: "News",
  jobs: "Jobs",
  games: "Games",
  network: "Network",
  table: "Tables",
  gate: "Sign in",
  other: "Other",
};

type Slice =
  | "live"
  | "live-guests"
  | "live-players"
  | "today"
  | "today-guests"
  | "today-players"
  | "week"
  | "accounts"
  | "applications"
  | "reports"
  | `day:${string}`
  | `door:${VisitDoor}:${string}`;

function dayLabel(day: string) {
  const at = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(at)) return day;
  return new Date(at).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

export function ManageDash({
  traffic,
  people,
  you,
  roll,
  canManage,
}: {
  traffic: DeskTraffic;
  people: DeskPerson[];
  you: string;
  roll: VisitRoll;
  canManage: boolean;
}) {
  const [desk, setDesk] = useState(traffic);
  const [seats, setSeats] = useState(people);
  const [who, setWho] = useState(roll);
  const [slice, setSlice] = useState<Slice>("accounts");
  const [focusDay, setFocusDay] = useState("");

  useEffect(() => {
    setDesk(traffic);
  }, [traffic]);

  useEffect(() => {
    setSeats(people);
  }, [people]);

  useEffect(() => {
    setWho(roll);
  }, [roll]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void fetch("/api/manage")
        .then((res) => res.json())
        .then((data: { traffic?: DeskTraffic; people?: DeskPerson[]; roll?: VisitRoll }) => {
          if (data.traffic) setDesk(data.traffic);
          if (data.people) setSeats(data.people);
          if (data.roll) setWho(data.roll);
        })
        .catch(() => undefined);
    }, 20_000);
    return () => window.clearInterval(id);
  }, []);

  function open(next: Slice) {
    setSlice(next);
    if (next.startsWith("day:")) setFocusDay(next.slice(4));
    else if (next.startsWith("door:")) setFocusDay(next.slice(next.lastIndexOf(":") + 1));
    else setFocusDay("");
    if (next === "applications") document.getElementById("manage-hiring")?.scrollIntoView({ behavior: "smooth" });
    if (next === "reports") document.getElementById("manage-reports")?.scrollIntoView({ behavior: "smooth" });
  }

  const byId = new Map(seats.map((row) => [row.id, row]));
  const named = (ids: string[]) => ids.map((id) => byId.get(id)).filter((row): row is DeskPerson => Boolean(row));
  const day = slice.startsWith("day:") ? who.days.find((row) => row.day === slice.slice(4)) : null;
  const doorPick = readDoor(slice);
  const doorDay = focusDay || desk.today.day;
  const shownDoors = (who.doorDays ?? [])
    .filter((row) => row.day === doorDay)
    .sort((a, b) => b.hits - a.hits);
  const doorRow = doorPick ? shownDoors.find((row) => row.door === doorPick.door && row.day === doorPick.day) : null;
  const picked =
    slice === "accounts"
      ? seats
      : slice === "live" || slice === "live-players"
        ? named(who.liveUserIds)
        : slice === "today" || slice === "today-players"
          ? named(who.todayUserIds)
          : slice === "week"
            ? named(who.weekUserIds)
            : day
              ? named(day.userIds)
              : doorPick
                ? named(doorRow?.userIds ?? [])
                : [];
  const guests =
    slice === "live" || slice === "live-guests"
      ? who.liveGuests
      : slice === "today" || slice === "today-guests"
        ? who.todayGuests
        : slice === "week"
          ? who.weekGuests
          : day
            ? day.guests
            : 0;
  const unnamed =
    slice === "live" || slice === "live-players"
      ? who.liveUnnamed
      : slice === "today" || slice === "today-players"
        ? who.todayUnnamed
        : day
          ? day.unnamed
          : 0;
  const showPeople = canManage && slice !== "applications" && slice !== "reports" && slice !== "live-guests" && slice !== "today-guests";
  const seen = Object.fromEntries(
    lastSeen(who.days ?? [], who.doorDays ?? []).map((row) => {
      const doors = row.doors.map((door) => DOOR_LABEL[door]).join(", ");
      const line = doors ? `Last here ${dayLabel(row.day)} · ${doors}` : `Last here ${dayLabel(row.day)}`;
      return [row.userId, line];
    }),
  );

  return (
    <section className="manage-dash" aria-label="House visitors">
      <p className="lobby-label">House now</p>
      <div className="manage-kpis">
        <Count active={slice === "live"} label="Visitors live" n={desk.now.visitors} onClick={() => open("live")} />
        <Count active={slice === "live-guests"} label="Guests live" n={desk.now.guests} onClick={() => open("live-guests")} />
        <Count active={slice === "live-players"} label="Players live" n={desk.now.players} onClick={() => open("live-players")} />
        <Count active={slice === "today"} label="Visitors today" n={desk.today.visitors} onClick={() => open("today")} />
        <Count active={slice === "today-guests"} label="Guests today" n={desk.today.guests} onClick={() => open("today-guests")} />
        <Count active={slice === "today-players"} label="Players today" n={desk.today.players} onClick={() => open("today-players")} />
        <Count active={slice === "week"} label="Visitors this week" n={desk.week.visitors} onClick={() => open("week")} />
        <Count active={slice === "accounts"} label="Accounts" n={desk.accounts} onClick={() => open("accounts")} />
        <Count active={slice === "applications"} label="Open applications" n={desk.openApplications} onClick={() => open("applications")} />
        <Count active={slice === "reports"} label="Open reports" n={desk.openReports} onClick={() => open("reports")} />
      </div>
      <p className="account-note">
        {desk.today.hits} view{desk.today.hits === 1 ? "" : "s"} today · {desk.week.hits} this
        week. Open a number to see who it is. A guest has no seat.
      </p>
      <div className="manage-week" aria-label="Visitors this week">
        {desk.days.map((row) => (
          <button
            className={`li-card manage-day${slice === `day:${row.day}` || doorPick?.day === row.day ? " is-on" : ""}`}
            key={row.day}
            onClick={() => open(`day:${row.day}`)}
            type="button"
          >
            <strong>{row.visitors}</strong>
            <span>{dayLabel(row.day)}</span>
          </button>
        ))}
      </div>
      {shownDoors.length ? (
        <ul className="manage-doors" aria-label={`${dayLabel(doorDay)} doors`}>
          {shownDoors.map((row) => (
            <li key={`${row.day}-${row.door}`}>
              <button
                className={`manage-door${doorPick?.door === row.door && doorPick.day === row.day ? " is-on" : ""}`}
                onClick={() => open(`door:${row.door}:${row.day}`)}
                type="button"
              >
                {DOOR_LABEL[row.door]} {row.hits}
              </button>
            </li>
          ))}
        </ul>
      ) : focusDay ? (
        <p className="account-note">No door views that day.</p>
      ) : null}
      {slice === "applications" || slice === "reports" ? (
        <p className="account-note">{slice === "reports" ? "Reports are below." : "Applications are below."}</p>
      ) : (
        <div className="manage-detail">
          <p className="lobby-label">{labelOf(slice, day?.day, doorPick)}</p>
          {guests ? (
            <p className="account-note">
              {guests} guest{guests === 1 ? "" : "s"}. A guest has no account, so there is nothing to manage until they sign in.
            </p>
          ) : null}
          {unnamed ? (
            <p className="account-note">
              {unnamed} signed-in visit{unnamed === 1 ? "" : "s"} from before this desk stored a name.
            </p>
          ) : null}
          {doorPick ? (
            <p className="account-note">
              {doorRow?.hits ?? 0} view{(doorRow?.hits ?? 0) === 1 ? "" : "s"} on {dayLabel(doorPick.day)}. A guest has no account. Views from before a name was kept stay a count.
            </p>
          ) : null}
          {showPeople ? (
            <ManagePeople people={picked} seen={seen} you={you} onPeople={setSeats} />
          ) : slice === "live-guests" || slice === "today-guests" ? null : (
            <p className="account-note">Seat actions are for a manager.</p>
          )}
        </div>
      )}
    </section>
  );
}

function readDoor(slice: string) {
  if (!slice.startsWith("door:")) return null;
  const rest = slice.slice(5);
  const cut = rest.lastIndexOf(":");
  if (cut < 0) return null;
  return { door: parseVisitDoor(rest.slice(0, cut)), day: rest.slice(cut + 1) };
}

function labelOf(slice: Slice, day?: string, door?: { door: VisitDoor; day: string } | null) {
  if (slice === "live") return "Visitors live";
  if (slice === "live-guests") return "Guests live";
  if (slice === "live-players") return "Players live";
  if (slice === "today") return "Visitors today";
  if (slice === "today-guests") return "Guests today";
  if (slice === "today-players") return "Players today";
  if (slice === "week") return "Visitors this week";
  if (slice === "accounts") return "Accounts";
  if (door) return `${DOOR_LABEL[door.door]} · ${dayLabel(door.day)}`;
  if (day) return dayLabel(day);
  return "Seats";
}

function Count({
  n,
  label,
  active,
  onClick,
}: {
  n: number;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`li-card manage-kpi${active ? " is-on" : ""}`} onClick={onClick} type="button">
      <strong>{n}</strong>
      <span>{label}</span>
    </button>
  );
}
