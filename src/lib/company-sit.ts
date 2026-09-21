import { blockedIds, companyIds, readyFriends, seatedAt } from "@/lib/friends";
import { isHouseUser } from "@/lib/house";
import { notify } from "@/lib/notifications";
import {
  afterTakeNoticeBody,
  afterTakeNoticeTitle,
} from "@/lib/after-take";
import {
  SIT_PULSE_MS,
  alreadyPulsed,
  companySitTargets,
  sitPulseBody,
  sitPulseTitle,
} from "@/lib/sit-pulse";
import type { CompanySit, Room, StoreData, User } from "@/lib/types";

const HALL_SIT_CAP = 3;

export function listCompanySitting(store: StoreData, userId: string | null): CompanySit[] {
  if (!userId) return [];
  let ids: string[] = [];
  try {
    ids = companySitTargets(userId, companyIds(userId), blockedIds(userId));
  } catch {
    return [];
  }
  const out: CompanySit[] = [];
  for (const id of ids) {
    const friend = store.users[id];
    if (!friend || friend.closedAt || isHouseUser(friend)) continue;
    const room = seatedAt(store, id);
    if (!room) continue;
    out.push({ username: friend.username, slug: room.slug, name: room.name });
    if (out.length >= HALL_SIT_CAP) break;
  }
  return out;
}

export async function notifyCompanyOnSit(
  store: StoreData,
  user: User,
  room: Room,
  at = Date.now(),
) {
  if (isHouseUser(user) || user.closedAt) return;
  await readyFriends();
  const title = sitPulseTitle(room.name, user.username);
  const since = at - SIT_PULSE_MS;
  const href = `/rooms/${room.slug}`;
  const targets = companySitTargets(user.id, companyIds(user.id), blockedIds(user.id));
  for (const id of targets) {
    const friend = store.users[id];
    if (!friend || friend.closedAt || isHouseUser(friend) || !friend.emailVerified) {
      continue;
    }
    if (alreadyPulsed(store.notifications, id, title, since)) continue;
    notify(store, id, {
      kind: "friend",
      title,
      body: sitPulseBody(),
      href,
    });
  }
}

export async function notifyCompanyOnTable(
  store: StoreData,
  user: User,
  room: Room,
  at = Date.now(),
) {
  if (isHouseUser(user) || user.closedAt) return;
  await readyFriends();
  const title = afterTakeNoticeTitle(user.username);
  const since = at - SIT_PULSE_MS;
  const href = `/rooms/${room.slug}`;
  const targets = companySitTargets(user.id, companyIds(user.id), blockedIds(user.id));
  for (const id of targets) {
    const friend = store.users[id];
    if (!friend || friend.closedAt || isHouseUser(friend) || !friend.emailVerified) {
      continue;
    }
    if (alreadyPulsed(store.notifications, id, title, since)) continue;
    notify(store, id, {
      kind: "friend",
      title,
      body: afterTakeNoticeBody(),
      href,
    });
  }
}
