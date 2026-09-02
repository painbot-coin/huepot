import { classicHourAt } from "./classic-hour";
import { fogCupAt, fogCupClock } from "./fog-cup";
import { HOUSE_USER_ID, isHouseUser } from "./house";
import { notify } from "./notifications";
import type { StoreData } from "./types";

const WEEK = 7 * 24 * 60 * 60 * 1000;
let classicAnnounced = 0;
let fogAnnounced = 0;

function recentSitters(store: StoreData, now: number) {
  const ids = new Set<string>();
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

function pingSitters(
  store: StoreData,
  now: number,
  input: { title: string; body: string; href: string; since: number },
) {
  for (const id of recentSitters(store, now)) {
    if (id === HOUSE_USER_ID) continue;
    const user = store.users[id];
    if (!user || !user.emailVerified || isHouseUser(user)) continue;
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
  const tick = () => {
    const now = Date.now();
    const hour = classicHourAt(now);
    const cup = fogCupAt(now);
    const pending =
      (hour.live && classicAnnounced !== hour.startAt) ||
      (cup.live && fogAnnounced !== cup.startAt);
    if (!pending) {
      setTimeout(tick, 30_000);
      return;
    }
    void import("./store")
      .then(({ withStore }) => withStore((store) => announceSitWindows(store)))
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
    pingSitters(store, now, {
      title: "Classic hour is on",
      body: "Sit Classic. The named hour just opened.",
      href: "/rooms/classic",
      since: hour.startAt,
    });
  }
  const cup = fogCupAt(now);
  if (cup.live && fogAnnounced !== cup.startAt) {
    fogAnnounced = cup.startAt;
    pingSitters(store, now, {
      title: "Fog cup is on",
      body: `Sit Fog. ${fogCupClock(cup.weekday, cup.hour)}.`,
      href: "/rooms/fog",
      since: cup.startAt,
    });
  }
}
