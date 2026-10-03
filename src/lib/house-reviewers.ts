/**
 * Who keeps the report desk. A reviewer is a signed-in seat, not staff IP.
 * Managers can add the first names. REVIEWER_USERNAMES stay on the roster.
 */

import { isManagerUser, listManagerUsers } from "@/lib/house-managers";
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

export const REVIEWER_CAP = 20;

export function namedReviewers() {
  return (process.env.REVIEWER_USERNAMES ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, REVIEWER_CAP);
}

export function isReviewerUser(user: User | null | undefined, named = namedReviewers()) {
  if (!user || user.closedAt || isHouseAccount(user)) return false;
  if (user.reviewer) return true;
  return named.includes(user.username.toLowerCase());
}

export function canKeepDesk(user: User | null | undefined) {
  return isReviewerUser(user) || isManagerUser(user);
}

export function listReviewerUsers(store: StoreData) {
  const named = namedReviewers();
  return Object.values(store.users)
    .filter((user) => isReviewerUser(user, named))
    .sort((a, b) => a.username.localeCompare(b.username))
    .slice(0, REVIEWER_CAP);
}

export function listReviewerNames(store: StoreData) {
  return listReviewerUsers(store).map((user) => user.username);
}

export function reportNotice(username: string, reportId = "") {
  const who = username.trim() || "a seat";
  const href = reportId ? `/manage?report=${encodeURIComponent(reportId)}` : "/manage";
  return { title: "New report", body: `A seat named @${who}.`, href };
}

export function notifyReportDesk(
  store: StoreData,
  skipIds: string[],
  input: { title: string; body: string; href?: string },
) {
  const skip = new Set([HOUSE_USER_ID, ...skipIds.filter(Boolean)]);
  const desk = listReviewerUsers(store);
  const targets = desk.length ? desk : listManagerUsers(store);
  let n = 0;
  for (const user of targets) {
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

export function notifyNewReport(
  store: StoreData,
  row: { id: string; reporterId: string; username: string },
) {
  const named = Object.values(store.users).find(
    (user) => user.username.toLowerCase() === row.username.toLowerCase(),
  );
  return notifyReportDesk(store, [row.reporterId, named?.id ?? ""], reportNotice(row.username, row.id));
}

export function claimFirstReviewer(store: StoreData, user: User, allowed: boolean) {
  if (!allowed || !user || isHouseAccount(user) || user.closedAt) return false;
  if (listReviewerUsers(store).length) return false;
  user.reviewer = true;
  notify(store, user.id, {
    kind: "system",
    title: "Report desk",
    body: "You keep the report desk on Manage.",
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

export function grantReviewer(store: StoreData, username: string) {
  const user = requireNamedSeat(store, username);
  if (isReviewerUser(user)) return user;
  if (listReviewerUsers(store).length >= REVIEWER_CAP) {
    throw new Error("The report desk is full.");
  }
  user.reviewer = true;
  notify(store, user.id, {
    kind: "system",
    title: "Report desk",
    body: "You keep the report desk on Manage.",
    href: "/manage",
  });
  return user;
}

export function revokeReviewer(store: StoreData, username: string) {
  const user = requireNamedSeat(store, username);
  if (namedReviewers().includes(user.username.toLowerCase())) {
    throw new Error("That name is listed as a reviewer.");
  }
  if (!user.reviewer) throw new Error("That account is not on the report roster.");
  const others = listReviewerUsers(store).filter((row) => row.id !== user.id);
  if (!others.length) throw new Error("Keep at least one reviewer.");
  user.reviewer = false;
  notify(store, user.id, {
    kind: "system",
    title: "Report desk",
    body: "You are no longer on the report roster.",
    href: "/jobs",
  });
  return user;
}
