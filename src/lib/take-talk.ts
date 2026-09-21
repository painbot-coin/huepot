/**
 * A real take talks on the wing.
 *
 * Empty, push and void rounds stay quiet. The body is the same house line
 * the take page already uses. The link is what makes a house post visible.
 */

import { formatTakeLine } from "@/lib/take-copy";

export const TAKE_POST_TITLE = "The take";

export type TakeTalk = {
  id: string;
  names: string;
  amount: number;
  roomName: string;
  at?: number;
};

const pending: TakeTalk[] = [];

export function takePostId(takeId: string) {
  return `take-${takeId.trim()}`;
}

export function takePostHref(takeId: string) {
  const id = takeId.trim();
  return id ? `/take/${id}` : "";
}

export function isTakePostHref(href: string) {
  return /^\/take\/[A-Za-z0-9-]+$/.test(href.trim());
}

/** House link cards: a take is ours, anything else with a link is the wire. */
export function houseCardKind(link: string): "take" | "wire" | "" {
  const href = (link ?? "").trim();
  if (!href) return "";
  return isTakePostHref(href) ? "take" : "wire";
}

export function shouldTalkAboutTake(take: TakeTalk | null | undefined) {
  if (!take) return false;
  if (!take.id.trim()) return false;
  if (take.amount <= 0) return false;
  if (!take.names.trim() || !take.roomName.trim()) return false;
  return true;
}

export function takeTalkFields(take: TakeTalk) {
  return {
    id: takePostId(take.id),
    body: formatTakeLine(take.names, take.amount, take.roomName),
    link: takePostHref(take.id),
    title: TAKE_POST_TITLE,
    source: take.roomName.trim(),
  };
}

export function queueTakeTalk(take: TakeTalk | null | undefined) {
  if (!shouldTalkAboutTake(take) || !take) return;
  pending.push({
    id: take.id.trim(),
    names: take.names.trim(),
    amount: take.amount,
    roomName: take.roomName.trim(),
    at: take.at,
  });
}

export function takeTalkPending() {
  return pending.splice(0);
}
