import { classicHourAt } from "./classic-hour";
import { prisma } from "./db";
import { fogCupAt, fogCupClock } from "./fog-cup";
import { blockedIds, companyIds, readyFriends } from "./friends";
import { HOUSE_USER_ID, isHouseUser } from "./house";
import {
  classicHourNoticeBody,
  classicHourNoticeTitle,
  fogCupNoticeBody,
  fogCupNoticeTitle,
  hourAudience,
  nightHourNoticeBody,
  nightHourNoticeTitle,
} from "./hour-pulse";
import { nightHourAt } from "./night-hour";
import { notify } from "./notifications";
import type { StoreData } from "./types";

const WEEK = 7 * 24 * 60 * 60 * 1000;
let classicAnnounced = 0;
let fogAnnounced = 0;
let nightAnnounced = 0;
let cachedSitters: string[] = [];

async function loadRecentSitters(now: number) {
  const since = now - WEEK;
  const rows = await prisma.$queryRaw<{ playerId: string }[]>`
    SELECT DISTINCT playerId FROM Tx
    WHERE type = 'click' AND createdAt >= ${since}
  `;
  cachedSitters = rows.map((row) => row.playerId);
}

function recentSitters(store: StoreData, now: number) {
  const ids = new Set(cachedSitters);
  for (const tx of store.txs) {
    if (tx.type !== "click") continue;
    if (now - tx.createdAt > WEEK) continue;
    ids.add(tx.playerId);
  }
  return [...ids];
}

function alreadyPinged(
  store: StoreData,
  userId: string,
  title: string,
  since: number,
) {
  return store.notifications.some(
    (item) =>
      item.userId === userId && item.title === title && item.createdAt >= since,
  );
}

function safeCompany(id: string) {
  try {
    return companyIds(id);
  } catch {
    return [];
  }
}

function safeBlocked(id: string) {
  try {
    return blockedIds(id);
  } catch {
    return [];
  }
}

function pingHour(
  store: StoreData,
  now: number,
  input: { title: string; body: string; href: string; since: number },
) {
  const ids = hourAudience(recentSitters(store, now), safeCompany, safeBlocked);
  for (const id of ids) {
    if (id === HOUSE_USER_ID) continue;
    const user = store.users[id];
    if (!user || user.closedAt || !user.emailVerified || isHouseUser(user)) continue;
    if (alreadyPinged(store, id, input.title, input.since)) continue;
    notify(store, id, {
      kind: "system",
      title: input.title,
      body: input.body,
      href: input.href,
    });
  }
}

let watching = false;

export function startSitWindowWatcher() {
  if (watching) return;
  watching = true;
  void loadRecentSitters(Date.now()).catch(() => undefined);
  void readyFriends().catch(() => undefined);
  const tick = () => {
    const now = Date.now();
    const hour = classicHourAt(now);
    const night = nightHourAt(now);
    const cup = fogCupAt(now);
    const pending =
      (hour.live && classicAnnounced !== hour.startAt) ||
      (night.live && nightAnnounced !== night.startAt) ||
      (cup.live && fogAnnounced !== cup.startAt);
    void Promise.all([
      loadRecentSitters(now).catch(() => undefined),
      readyFriends().catch(() => undefined),
    ])
      .then(() => {
        if (!pending) return;
        return import("./store").then(({ withStore }) =>
          withStore((store) => announceSitWindows(store)),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        setTimeout(tick, 30_000);
      });
  };
  setTimeout(tick, 2_000);
}

export function announceSitWindows(store: StoreData, now = Date.now()) {
  const hour = classicHourAt(now);
  if (hour.live && classicAnnounced !== hour.startAt) {
    classicAnnounced = hour.startAt;
    pingHour(store, now, {
      title: classicHourNoticeTitle(),
      body: classicHourNoticeBody(),
      href: "/rooms/classic",
      since: hour.startAt,
    });
  }
  const night = nightHourAt(now);
  if (night.live && nightAnnounced !== night.startAt) {
    nightAnnounced = night.startAt;
    pingHour(store, now, {
      title: nightHourNoticeTitle(),
      body: nightHourNoticeBody(),
      href: "/rooms/night",
      since: night.startAt,
    });
  }
  const cup = fogCupAt(now);
  if (cup.live && fogAnnounced !== cup.startAt) {
    fogAnnounced = cup.startAt;
    pingHour(store, now, {
      title: fogCupNoticeTitle(),
      body: fogCupNoticeBody(fogCupClock(cup.weekday, cup.hour)),
      href: "/rooms/fog",
      since: cup.startAt,
    });
  }
}
