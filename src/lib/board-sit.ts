/**
 * Board row doors. Same labels as company — a rank opens a sit, not a list.
 */

import {
  COMPANY_CLASSIC_HREF,
  sitClassicLabel,
  sitWithThemLabel,
} from "@/lib/company-door";

export type BoardRelation =
  | "none"
  | "outgoing"
  | "incoming"
  | "friends"
  | "blocked"
  | "blocked-by"
  | "";

export type BoardSitDoor = {
  sitHref: string;
  sitLabel: string;
  ask: boolean;
  sent: boolean;
};

export function boardPlaceFor(
  seats: { username: string; place: number }[],
  username: string,
) {
  const name = username.trim().toLowerCase();
  if (!name) return null;
  const seat = seats.find((row) => row.username.toLowerCase() === name);
  return seat ? seat.place : null;
}

export function boardSitDoor(input: {
  self: boolean;
  signedIn: boolean;
  relation: BoardRelation;
  sittingSlug: string;
}): BoardSitDoor {
  const slug = input.sittingSlug.trim();
  const withThem = Boolean(slug) && input.signedIn && !input.self;
  return {
    sitHref: withThem ? `/rooms/${slug}` : COMPANY_CLASSIC_HREF,
    sitLabel: withThem ? sitWithThemLabel() : sitClassicLabel(),
    ask: input.signedIn && !input.self && input.relation === "none",
    sent: input.signedIn && !input.self && input.relation === "outgoing",
  };
}
