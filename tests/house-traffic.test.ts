import assert from "node:assert/strict";
import test from "node:test";
import {
  LIVE_MS,
  daysBack,
  deskTraffic,
  emptyDay,
  fillWeekDays,
  isVisitBot,
  liveCounts,
  doorDays,
  doorPeople,
  lastSeen,
  liveRoll,
  whoRoll,
  utcDay,
  visitDoor,
  visitKey,
  visitKind,
} from "@/lib/house-traffic";

test("a guest and a player are both visitors", () => {
  assert.equal(visitKind(false), "guest");
  assert.equal(visitKind(true), "player");
  assert.equal(visitKey("guest", "aabbccddeeff00112233445566778899"), "g:aabbccddeeff00112233445566778899");
});

test("doors stay coarse — no raw path on the desk", () => {
  assert.equal(visitDoor("/"), "home");
  assert.equal(visitDoor("/news/abc"), "news");
  assert.equal(visitDoor("/jobs/you"), "jobs");
  assert.equal(visitDoor("/manage"), "jobs");
  assert.equal(visitDoor("/companies/acme"), "companies");
  assert.equal(visitDoor("/contracts/pact"), "contracts");
  assert.equal(visitDoor("/atrium/developers"), "agents");
  assert.equal(visitDoor("/board"), "board");
  assert.equal(visitDoor("/wait/store"), "games");
  assert.equal(visitDoor("/network/people"), "network");
  assert.equal(visitDoor("/rooms/classic"), "table");
  assert.equal(visitDoor("/take/abc"), "table");
  assert.equal(visitDoor("/signin"), "gate");
  assert.equal(visitDoor("/account"), "other");
});

test("crawlers are not visitors", () => {
  assert.equal(isVisitBot("Mozilla/5.0 Googlebot/2.1"), true);
  assert.equal(isVisitBot("HuepotNewsBot/1.0"), true);
  assert.equal(isVisitBot("Mozilla/5.0 Chrome/120"), false);
});

test("live counts drop after five minutes", () => {
  const now = 1_000_000;
  const counts = liveCounts(
    [
      { at: now - 1_000, kind: "guest" },
      { at: now - 2_000, kind: "player" },
      { at: now - LIVE_MS - 1, kind: "guest" },
    ],
    now,
  );
  assert.deepEqual(counts, { visitors: 2, guests: 1, players: 1 });
});

test("the week fills empty UTC days with zeros", () => {
  const end = "2026-09-26";
  assert.equal(daysBack(end, 6), "2026-09-20");
  const days = fillWeekDays([{ day: end, hits: 4, visitors: 2, guests: 1, players: 1 }], end);
  assert.equal(days.length, 7);
  assert.equal(days[0]?.day, "2026-09-20");
  assert.equal(days[6]?.visitors, 2);
  assert.equal(days[1]?.visitors, 0);
});

test("the desk never invents a visitor", () => {
  const desk = deskTraffic({
    now: { visitors: 0, guests: 0, players: 0 },
    today: emptyDay("2026-09-26"),
    weekHits: 0,
    weekVisitors: 0,
    days: [],
    doors: [],
    accounts: 3,
    applications: 1,
    openApplications: 1,
    openReports: 0,
    day: "2026-09-26",
  });
  assert.equal(desk.today.visitors, 0);
  assert.equal(desk.week.visitors, 0);
  assert.equal(desk.accounts, 3);
  assert.equal(desk.openReports, 0);
  assert.equal(utcDay(Date.parse("2026-09-26T12:00:00.000Z")), "2026-09-26");
});

test("a live number names the signed-in seat and leaves a guest unnamed", () => {
  const now = 5_000_000;
  const roll = liveRoll(
    [
      { at: now - 1_000, kind: "player", userId: "ada" },
      { at: now - 1_000, kind: "guest" },
      { at: now - LIVE_MS - 5, kind: "player", userId: "old" },
    ],
    now,
  );
  assert.deepEqual(roll.userIds, ["ada"]);
  assert.equal(roll.guests, 1);
  const week = whoRoll(
    [
      { day: "2026-10-03", kind: "player", userId: "ada", vid: "g:1" },
      { day: "2026-10-03", kind: "guest", userId: "", vid: "g:2" },
      { day: "2026-10-02", kind: "player", userId: "bea", vid: "g:3" },
    ],
    "2026-10-03",
    "2026-09-27",
  );
  assert.deepEqual(week.todayUserIds, ["ada"]);
  assert.equal(week.todayGuests, 1);
  assert.deepEqual(week.weekUserIds.sort(), ["ada", "bea"]);
});

test("a door names each signed-in seat once and skips a guest", () => {
  const doors = doorPeople([
    { door: "network", userId: "ada" },
    { door: "network", userId: "ada" },
    { door: "network", userId: "" },
    { door: "jobs", userId: "bea" },
    { door: "nope", userId: "cy" },
  ]);
  const network = doors.find((row) => row.door === "network");
  const jobs = doors.find((row) => row.door === "jobs");
  const other = doors.find((row) => row.door === "other");
  assert.deepEqual(network?.userIds, ["ada"]);
  assert.deepEqual(jobs?.userIds, ["bea"]);
  assert.deepEqual(other?.userIds, ["cy"]);
});

test("a weekday keeps its own doors and does not borrow today's names", () => {
  const rows = doorDays(
    [
      { day: "2026-10-03", door: "jobs", hits: 4 },
      { day: "2026-10-02", door: "news", hits: 2 },
      { day: "2026-10-02", door: "news", hits: 1 },
    ],
    [
      { day: "2026-10-03", door: "jobs", userId: "ada" },
      { day: "2026-10-03", door: "jobs", userId: "ada" },
      { day: "2026-10-03", door: "jobs", userId: "" },
      { day: "2026-10-02", door: "home", userId: "bea" },
    ],
  );
  const jobs = rows.find((row) => row.day === "2026-10-03" && row.door === "jobs");
  const news = rows.find((row) => row.day === "2026-10-02" && row.door === "news");
  const home = rows.find((row) => row.day === "2026-10-02" && row.door === "home");
  assert.equal(jobs?.hits, 4);
  assert.deepEqual(jobs?.userIds, ["ada"]);
  assert.equal(news?.hits, 3);
  assert.deepEqual(news?.userIds, []);
  assert.equal(home?.hits, 0);
  assert.deepEqual(home?.userIds, ["bea"]);
  assert.equal(rows.some((row) => row.day === "2026-10-02" && row.userIds.includes("ada")), false);
});

test("last here is the latest named day and only that day's doors", () => {
  const rows = lastSeen(
    [
      { day: "2026-10-02", userIds: ["ada", ""] },
      { day: "2026-10-03", userIds: ["ada"] },
      { day: "2026-10-01", userIds: ["bea"] },
    ],
    [
      { day: "2026-10-02", door: "home", userIds: ["ada"] },
      { day: "2026-10-03", door: "jobs", userIds: ["ada"] },
      { day: "2026-10-03", door: "network", userIds: ["ada"] },
    ],
  );
  const ada = rows.find((row) => row.userId === "ada");
  const bea = rows.find((row) => row.userId === "bea");
  assert.equal(ada?.day, "2026-10-03");
  assert.deepEqual(ada?.doors, ["jobs", "network"]);
  assert.equal(bea?.day, "2026-10-01");
  assert.deepEqual(bea?.doors, []);
  assert.equal(rows.some((row) => row.userId === ""), false);
});
