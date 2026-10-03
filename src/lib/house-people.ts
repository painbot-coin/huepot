import { isManagerUser, namedManagers } from "@/lib/house-managers";
import { isReviewerUser } from "@/lib/house-reviewers";
import { parseHouseSeat, seatLabel } from "@/lib/house-seats";
import { userLimits } from "@/lib/limits";
import { notify } from "@/lib/notifications";
import { staffFreezeUser } from "@/lib/staff";
import type { StoreData, User } from "@/lib/types";

export type DeskPerson = {
  id: string;
  username: string;
  seat: string;
  craft: string;
  createdAt: number;
  closed: boolean;
  manager: boolean;
  reviewer: boolean;
  frozen: boolean;
  invite: string;
};

function isHouseAccount(user: User) {
  return user.id === "house" || user.username.toLowerCase() === "house";
}

function namedSeat(store: StoreData, username: string) {
  const needle = username.trim().toLowerCase();
  if (!needle) throw new Error("Name a username.");
  const found = Object.values(store.users).find((user) => user.username.toLowerCase() === needle);
  if (!found || isHouseAccount(found)) throw new Error("That account was not found.");
  return found;
}

export function listDeskPeople(store: StoreData): DeskPerson[] {
  return Object.values(store.users)
    .filter((user) => !isHouseAccount(user))
    .sort((a, b) => a.username.localeCompare(b.username))
    .map((user) => ({
      id: user.id,
      username: user.username,
      seat: user.seat ?? "",
      craft: seatLabel(user.seat) || "No craft",
      createdAt: user.createdAt,
      closed: Boolean(user.closedAt),
      manager: isManagerUser(user),
      reviewer: isReviewerUser(user),
      frozen: userLimits(user).frozen,
      invite: user.inviteCode ?? "",
    }));
}

export function setDeskCraft(store: StoreData, actor: User, username: string, raw: string) {
  if (!isManagerUser(actor)) throw new Error("Only a manager can set a craft.");
  const user = namedSeat(store, username);
  if (user.closedAt) throw new Error("That seat is closed.");
  const next = raw.trim() ? parseHouseSeat(raw) : "";
  user.seat = next;
  notify(store, user.id, {
    kind: "system",
    title: "Craft",
    body: next ? `Your craft is ${seatLabel(next)}.` : "Your craft was cleared.",
    href: `/network/u/${encodeURIComponent(user.username)}`,
  });
  return user;
}

export function closeDeskSeat(store: StoreData, actor: User, username: string) {
  if (!isManagerUser(actor)) throw new Error("Only a manager can close a seat.");
  const user = namedSeat(store, username);
  if (user.id === actor.id) throw new Error("Ask another manager to close your seat.");
  if (namedManagers().includes(user.username.toLowerCase())) {
    throw new Error("That name stays a manager.");
  }
  if (user.closedAt) throw new Error("That seat is already closed.");
  if (user.balance > 0) throw new Error("That seat still has USDT. Withdraw it before closing.");
  user.closedAt = Date.now();
  user.headline = "";
  user.about = "";
  user.location = "";
  user.avatar = "";
  user.manager = false;
  user.reviewer = false;
  for (const [token, session] of Object.entries(store.sessions)) {
    if (session.userId === user.id) delete store.sessions[token];
  }
  notify(store, user.id, {
    kind: "system",
    title: "Seat closed",
    body: "A manager closed this seat.",
    href: "/",
  });
  return user;
}

export function freezeDeskSeat(store: StoreData, actor: User, username: string, frozen: boolean) {
  if (!isManagerUser(actor)) throw new Error("Only a manager can freeze a seat.");
  const user = namedSeat(store, username);
  if (user.id === actor.id) throw new Error("Ask another manager to freeze your seat.");
  staffFreezeUser(store, user.id, frozen ? "Frozen from the manage desk." : "", frozen);
  return user;
}

export function reopenDeskSeat(store: StoreData, actor: User, username: string) {
  if (!isManagerUser(actor)) throw new Error("Only a manager can open a seat.");
  const user = namedSeat(store, username);
  if (!user.closedAt) throw new Error("That seat is open.");
  user.closedAt = 0;
  notify(store, user.id, {
    kind: "system",
    title: "Seat open",
    body: "A manager opened this seat again.",
    href: "/account",
  });
  return user;
}
