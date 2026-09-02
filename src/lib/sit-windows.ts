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

function pingSitters(
  store: StoreData,
  now: number,
  input: { title: string; body: string; href: string },
) {
  for (const id of recentSitters(store, now)) {
    if (id === HOUSE_USER_ID) continue;
    const user = store.users[id];
    if (!user || user.blocked || isHouseUser(user)) continue;
    notify(store, id, {
      kind: "system",
      title: input.title,
      body: input.body,
      href: input.href,
    });
  }
}

export function announceSitWindows(store: StoreData, now = Date.now()) {
  const hour = classicHourAt(now);
  if (hour.live && classicAnnounced !== hour.startAt) {
    classicAnnounced = hour.startAt;
    pingSitters(store, now, {
      title: "Classic hour is on",
      body: "Sit Classic. The named hour just opened.",
      href: "/rooms/classic",
    });
  }
  const cup = fogCupAt(now);
  if (cup.live && fogAnnounced !== cup.startAt) {
    fogAnnounced = cup.startAt;
    pingSitters(store, now, {
      title: "Fog cup is on",
      body: `Sit Fog. ${fogCupClock(cup.weekday, cup.hour)}.`,
      href: "/rooms/fog",
    });
  }
}
