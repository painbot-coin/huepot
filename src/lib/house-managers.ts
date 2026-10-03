/**
 * Who reads hire applications. A manager is a signed-in seat, not staff IP.
 * Staff can grant the first one. Names in MANAGER_USERNAMES stay managers.
 */

import { notify } from "@/lib/notifications";
import type { StoreData, User } from "@/lib/types";

const HOUSE_USER_ID = "house";

function isHouseAccount(user: { id?: string; username?: string; email?: string } | null) {
  if (!user) return false;
  return (
    user.id === HOUSE_USER_ID ||
    user.username?.toLowerCase() === "house" ||
    user.email?.toLowerCase() === "house@huepot.internal"
  );
}

export const MANAGER_CAP = 20;

export function namedManagers() {
  return (process.env.MANAGER_USERNAMES ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MANAGER_CAP);
}

export function isManagerUser(user: User | null | undefined, named = namedManagers()) {
  if (!user || user.closedAt || isHouseAccount(user)) return false;
  if (user.manager) return true;
  return named.includes(user.username.toLowerCase());
}

export function countLiveSeats(store: StoreData) {
  return Object.values(store.users).filter((user) => !user.closedAt && !isHouseAccount(user)).length;
}

export function listManagerUsers(store: StoreData) {
  const named = namedManagers();
  return Object.values(store.users)
    .filter((user) => isManagerUser(user, named))
    .sort((a, b) => a.username.localeCompare(b.username))
    .slice(0, MANAGER_CAP);
}

export function listManagerNames(store: StoreData) {
  return listManagerUsers(store).map((user) => user.username);
}

export function managerNotice(
  kind: "new" | "update" | "withdraw",
  username: string,
  title: string,
  appId = "",
) {
  const who = username.trim() || "A seat";
  const job = title.trim() || "a job";
  const href = appId ? `/manage?app=${encodeURIComponent(appId)}` : "/manage";
  if (kind === "update") {
    return { title: "Application updated", body: `@${who} updated ${job}.`, href };
  }
  if (kind === "withdraw") {
    return { title: "Application withdrawn", body: `@${who} withdrew ${job}.`, href: "/manage" };
  }
  return { title: "New application", body: `@${who} applied for ${job}.`, href };
}

export function notifyManagers(
  store: StoreData,
  applicantId: string,
  input: { title: string; body: string; href?: string },
) {
  const skip = new Set([applicantId, HOUSE_USER_ID]);
  let n = 0;
  for (const user of listManagerUsers(store)) {
    if (skip.has(user.id)) continue;
    notify(store, user.id, {
      kind: "system",
      title: input.title,
      body: input.body,
      href: input.href ?? "/manage",
    });
    n += 1;
  }
  return n;
}

export function claimFirstManager(store: StoreData, user: User, staffPresent: boolean) {
  if (!staffPresent || !user || isHouseAccount(user) || user.closedAt) return false;
  if (listManagerUsers(store).length) return false;
  user.manager = true;
  notify(store, user.id, {
    kind: "system",
    title: "Hiring desk",
    body: "You can read applications on Manage.",
    href: "/manage",
  });
  return true;
}

function requireNamedSeat(store: StoreData, username: string) {
  const needle = (username ?? "").trim().toLowerCase();
  if (!needle) throw new Error("Name a username.");
  const found = Object.values(store.users).find((user) => user.username.toLowerCase() === needle);
  if (!found || found.closedAt || isHouseAccount(found)) {
    throw new Error("That account was not found.");
  }
  return found;
}

export function grantManager(store: StoreData, username: string) {
  const user = requireNamedSeat(store, username);
  if (isManagerUser(user)) return user;
  if (listManagerUsers(store).length >= MANAGER_CAP) {
    throw new Error("The hiring desk is full.");
  }
  user.manager = true;
  notify(store, user.id, {
    kind: "system",
    title: "Hiring desk",
    body: "You can read applications on Manage.",
    href: "/manage",
  });
  return user;
}

export function revokeManager(store: StoreData, username: string) {
  const user = requireNamedSeat(store, username);
  if (namedManagers().includes(user.username.toLowerCase())) {
    throw new Error("That name is listed as a manager.");
  }
  if (!user.manager) throw new Error("That account is not a manager.");
  const others = listManagerUsers(store).filter((row) => row.id !== user.id);
  if (!others.length) throw new Error("Keep at least one manager.");
  user.manager = false;
  notify(store, user.id, {
    kind: "system",
    title: "Hiring desk",
    body: "You are no longer a manager.",
    href: "/jobs",
  });
  return user;
}
