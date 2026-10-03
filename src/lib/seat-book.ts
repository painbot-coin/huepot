/**
 * The book a seat names. The watch and the file travel with it.
 * Balance stays on the vault. Gold for the file returns to that sit.
 */

import { deskHref, markById, priceLabel, sitParam } from "@/lib/house-mark-list";

export type SeatBook = {
  id: string;
  name: string;
  how: string;
  watch: string;
  file: string;
  sitHref: string;
  /** Vault door for this file. Empty when gold is not asked for. */
  goldHref: string;
};

export function seatBookFace(
  raw: unknown,
  opts: {
    owned?: boolean;
    watchScore?: number | null;
    watchNote?: string;
    viewerIsSeat?: boolean;
  } = {},
): SeatBook | null {
  const id = sitParam(raw);
  const mark = id ? markById(id) : null;
  if (!mark || mark.status !== "live") return null;
  const note = (opts.watchNote ?? "").trim();
  const score = opts.watchScore;
  const watch =
    typeof score === "number" && Number.isFinite(score)
      ? note
        ? `Watch ${score} · ${note}`
        : `Watch ${score}`
      : "No watch yet.";
  const owned = Boolean(opts.owned);
  const priced = mark.priceCents > 0;
  const file = !priced ? "Free file" : owned ? "The file is on this seat." : `${priceLabel(mark.priceCents)} · gold returns to this sit`;
  const goldHref = opts.viewerIsSeat && priced && !owned ? `/invest?sit=${mark.id}` : "";
  return {
    id: mark.id,
    name: mark.name,
    how: mark.how,
    watch,
    file,
    sitHref: deskHref(mark.id),
    goldHref,
  };
}
