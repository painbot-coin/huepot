/**
 * Empty Classic is the public table. The first player starts the pot.
 * No fake clicks. Play credits stay play-only.
 */

export const FIRST_SIT_HREF = "/rooms/classic";
export const FIRST_SIT_LINE = "This table is empty. Be the first to play.";

export function afterSeatPath(next: string) {
  return next.trim() || FIRST_SIT_HREF;
}

export function classicWaitingFirstSit(room: {
  slug: string;
  pot: number;
  players: number;
}) {
  return room.slug === "classic" && room.pot <= 0 && room.players <= 0;
}

export function hallLiveDoor(
  room: { slug: string; players: number },
  flags: { nightLive?: boolean; cupLive?: boolean } = {},
) {
  if (room.slug === "classic") return true;
  if (room.slug === "night" && flags.nightLive) return true;
  if (room.slug === "fog" && flags.cupLive) return true;
  return room.players > 0;
}

export function firstSitCta(signedIn: boolean, hasSitChip: boolean) {
  if (!signedIn) return "Sign in to play";
  if (hasSitChip) return "Play credit · Classic";
  return "Play Classic";
}
