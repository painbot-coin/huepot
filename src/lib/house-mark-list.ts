/**
 * The wait-lab catalogue. Game RL books only.
 * Huepot betting stays on the pit. Buy stays in house-marks.
 */

import { AIM_DEEP_WEIGHTS, AIM_FIRST_WEIGHTS } from "@/lib/aim-weights";
import { CATCH_DEEP_WEIGHTS, CATCH_FIRST_WEIGHTS } from "@/lib/catch-weights";
import { BREAK_DEEP_WEIGHTS, BREAK_FIRST_WEIGHTS } from "@/lib/break-weights";
import { LANE_DEEP_WEIGHTS, LANE_FIRST_WEIGHTS } from "@/lib/lane-weights";
import { formatCents } from "@/lib/money";
import { safeNext } from "@/lib/next-path";
import { SNAKE_DEEP_WEIGHTS, SNAKE_FIRST_WEIGHTS } from "@/lib/snake-weights";
import { STACK_STYLES } from "@/lib/tetris-style";
import { STYLE_STACK_BEST, STYLE_STACK_WEIGHTS } from "@/lib/tetris-style-weights";

export type BookSnap = {
  weights: number[];
  bestLines?: number;
  games?: number;
};

export type MarkKind = "wait" | "catch" | "snake" | "aim" | "lane" | "break";
export type MarkDesk = "stack" | "catch" | "snake" | "aim" | "lane" | "break" | "soon";
export type MarkStatus = "live" | "coming";

export type HouseMark = {
  id: string;
  kind: MarkKind;
  desk: MarkDesk;
  name: string;
  version: string;
  tags: string[];
  how: string;
  features: string[];
  priceCents: number;
  status: MarkStatus;
  bestLines?: number;
  games?: number;
  playerType?: string;
};

export type PublicMark = HouseMark & {
  owned: boolean;
  priceLabel: string;
  /** Score of the shelf watch for this book. Not a lifetime best. */
  watchScore?: number;
  watchNote?: string;
};

const STACK_FEATURES = ["bias", "height", "holes", "bump", "peak", "wells"];
const CATCH_FEATURES = ["bias", "paddle", "token", "gap", "fall", "cover"];
const SNAKE_FEATURES = ["bias", "ahead", "left", "right", "foodA", "foodS"];
const AIM_FEATURES = ["bias", "error", "time", "streak"];
const LANE_FEATURES = ["bias", "range", "hp", "reach"];
const BREAK_FEATURES = ["bias", "pad", "ballx", "bally"];

export const MARK_GAMES: {
  id: MarkKind;
  title: string;
  how: string;
  desk: MarkDesk;
  status: MarkStatus;
}[] = [
  {
    id: "wait",
    title: "Stack",
    how: "Down stays low. Burst holds a column and takes a four.",
    desk: "stack",
    status: "live",
  },
  {
    id: "catch",
    title: "Catch",
    how: "The paddle covers the token from either side.",
    desk: "catch",
    status: "live",
  },
  {
    id: "snake",
    title: "Snake",
    how: "Stays on the loop. A watch counts what it ate.",
    desk: "snake",
    status: "live",
  },
  {
    id: "aim",
    title: "Aim",
    how: "Not Counter-Strike. The flick closes on the mark.",
    desk: "aim",
    status: "live",
  },
  {
    id: "lane",
    title: "Lane",
    how: "Not Dota. It waits, then last-hits the ripe mark.",
    desk: "lane",
    status: "live",
  },
  {
    id: "break",
    title: "Break",
    how: "A wall falls. The next ball comes down on the pad.",
    desk: "break",
    status: "live",
  },
];

export function liveMarksForKind(kind: MarkKind, marks: PublicMark[]) {
  return marks.filter((row) => row.kind === kind && row.status === "live");
}

/** Seven books a visitor came for. The card is the sit. The file is that book. */
export const AGENT_BOOKS = [
  { id: "wait-down", label: "Down" },
  { id: "wait-burst", label: "Burst" },
  { id: "catch-first", label: "Catch" },
  { id: "snake-first", label: "Snake" },
  { id: "aim-first", label: "Aim" },
  { id: "lane-first", label: "Lane" },
  { id: "break-first", label: "Break" },
] as const;

export function agentBookById(id: string) {
  return AGENT_BOOKS.find((row) => row.id === id) ?? null;
}

export function defaultWestId(kind: MarkKind) {
  if (kind === "wait") return "wait-down";
  if (kind === "catch") return "catch-first";
  if (kind === "snake") return "snake-first";
  if (kind === "aim") return "aim-first";
  if (kind === "lane") return "lane-first";
  if (kind === "break") return "break-first";
  return "";
}

export function defaultEastId(kind: MarkKind) {
  if (kind === "wait") return "wait-burst";
  if (kind === "catch") return "catch-deep";
  if (kind === "snake") return "snake-deep";
  if (kind === "aim") return "aim-deep";
  if (kind === "lane") return "lane-deep";
  if (kind === "break") return "break-deep";
  return "";
}

export function sitParam(raw: unknown) {
  const id = typeof raw === "string" ? raw.trim().slice(0, 40) : "";
  const mark = markById(id);
  if (!mark || mark.status !== "live") return "";
  return mark.id;
}

export function deskHref(id: string) {
  const sit = sitParam(id);
  return sit ? `/wait?sit=${sit}` : "/wait";
}

export function deskKind(id: string): MarkKind {
  return markById(sitParam(id))?.kind ?? "wait";
}

export function deskPair(kind: MarkKind, sit: string) {
  const mark = markById(sitParam(sit));
  const west = mark && mark.kind === kind ? mark.id : defaultWestId(kind);
  let east = defaultEastId(kind);
  if (east === west) east = defaultWestId(kind);
  if (east === west) {
    const live = kind === "wait" ? "wait-live" : `${kind}-live`;
    if (live !== west) east = live;
  }
  return { west, east };
}

const STACK_MARKS: HouseMark[] = STACK_STYLES.map((row) => ({
  id: row.markId,
  kind: "wait",
  desk: "stack",
  name: row.name,
  version: row.id === "live" ? "live" : String(row.games),
  tags: row.tags,
  how: row.how,
  features: STACK_FEATURES,
  priceCents: row.priceCents,
  status: "live",
  playerType: row.playerType,
  bestLines: row.id === "live" ? undefined : STYLE_STACK_BEST[row.id],
  games: row.id === "live" ? undefined : row.games,
}));

export const HOUSE_MARKS: HouseMark[] = [
  ...STACK_MARKS,
  {
    id: "catch-live",
    kind: "catch",
    desk: "catch",
    name: "The open catch",
    version: "live",
    tags: ["catch", "live", "TD", "free"],
    how: "Covers the token from the left and from the right. A lock still moves this book.",
    features: CATCH_FEATURES,
    priceCents: 0,
    status: "live",
  },
  {
    id: "catch-first",
    kind: "catch",
    desk: "catch",
    name: "Catch first sit",
    version: "1",
    tags: ["catch", "seed", "TD", "free"],
    how: "Tracks the token and slides under it from either side.",
    features: CATCH_FEATURES,
    priceCents: 0,
    status: "live",
    games: 80,
  },
  {
    id: "catch-deep",
    kind: "catch",
    desk: "catch",
    name: "Catch deep sit",
    version: "2",
    tags: ["catch", "deep", "TD", "vault"],
    how: "Closes the gap sooner, from either side.",
    features: CATCH_FEATURES,
    priceCents: 250,
    status: "live",
    games: 160,
  },
  {
    id: "snake-live",
    kind: "snake",
    desk: "snake",
    name: "The open snake",
    version: "live",
    tags: ["snake", "live", "TD", "free"],
    how: "Stays on the loop and cuts forward while the tail stays open. A watch counts the food.",
    features: SNAKE_FEATURES,
    priceCents: 0,
    status: "live",
  },
  {
    id: "snake-first",
    kind: "snake",
    desk: "snake",
    name: "Snake first sit",
    version: "1",
    tags: ["snake", "seed", "TD", "free"],
    how: "Turns off a wall and stays on the loop toward food.",
    features: SNAKE_FEATURES,
    priceCents: 0,
    status: "live",
    games: 80,
  },
  {
    id: "snake-deep",
    kind: "snake",
    desk: "snake",
    name: "Snake deep sit",
    version: "2",
    tags: ["snake", "deep", "TD", "vault"],
    how: "Cuts toward food while the tail stays open.",
    features: SNAKE_FEATURES,
    priceCents: 250,
    status: "live",
    games: 160,
  },
  {
    id: "aim-live",
    kind: "aim",
    desk: "aim",
    name: "The open aim",
    version: "live",
    tags: ["aim", "live", "TD", "free"],
    how: "Not Counter-Strike. Closes the gap on the mark.",
    features: AIM_FEATURES,
    priceCents: 0,
    status: "live",
  },
  {
    id: "aim-first",
    kind: "aim",
    desk: "aim",
    name: "Aim first sit",
    version: "1",
    tags: ["aim", "seed", "TD", "free"],
    how: "Not Counter-Strike. Moves toward the mark.",
    features: AIM_FEATURES,
    priceCents: 0,
    status: "live",
    games: 80,
  },
  {
    id: "aim-deep",
    kind: "aim",
    desk: "aim",
    name: "Aim deep sit",
    version: "2",
    tags: ["aim", "deep", "TD", "vault"],
    how: "Not Counter-Strike. Stays on the mark.",
    features: AIM_FEATURES,
    priceCents: 250,
    status: "live",
    games: 160,
  },
  {
    id: "lane-live",
    kind: "lane",
    desk: "lane",
    name: "The open lane",
    version: "live",
    tags: ["lane", "live", "TD", "free"],
    how: "Not Dota. Holds until the mark is ripe, then strikes.",
    features: LANE_FEATURES,
    priceCents: 0,
    status: "live",
  },
  {
    id: "lane-first",
    kind: "lane",
    desk: "lane",
    name: "Lane first sit",
    version: "1",
    tags: ["lane", "seed", "TD", "free"],
    how: "Not Dota. Waits for the ripe mark.",
    features: LANE_FEATURES,
    priceCents: 0,
    status: "live",
    games: 80,
  },
  {
    id: "lane-deep",
    kind: "lane",
    desk: "lane",
    name: "Lane deep sit",
    version: "2",
    tags: ["lane", "deep", "TD", "vault"],
    how: "Not Dota. Strikes when the well can take it.",
    features: LANE_FEATURES,
    priceCents: 250,
    status: "live",
    games: 160,
  },
  {
    id: "break-live",
    kind: "break",
    desk: "break",
    name: "The open break",
    version: "live",
    tags: ["break", "live", "TD", "free"],
    how: "Clears a wall. The next ball comes down on the pad.",
    features: BREAK_FEATURES,
    priceCents: 0,
    status: "live",
  },
  {
    id: "break-first",
    kind: "break",
    desk: "break",
    name: "Break first sit",
    version: "1",
    tags: ["break", "seed", "TD", "free"],
    how: "Slides the pad under the gold.",
    features: BREAK_FEATURES,
    priceCents: 0,
    status: "live",
    games: 80,
  },
  {
    id: "break-deep",
    kind: "break",
    desk: "break",
    name: "Break deep sit",
    version: "2",
    tags: ["break", "deep", "TD", "vault"],
    how: "Meets the gold, then stays with the next ball.",
    features: BREAK_FEATURES,
    priceCents: 250,
    status: "live",
    games: 160,
  },
];

const FROZEN: Record<string, number[]> = {
  ...Object.fromEntries(
    STACK_STYLES.filter((row) => row.id !== "live").map((row) => [
      row.markId,
      STYLE_STACK_WEIGHTS[row.id] ?? [],
    ]),
  ),
  "catch-first": CATCH_FIRST_WEIGHTS,
  "catch-deep": CATCH_DEEP_WEIGHTS,
  "snake-first": SNAKE_FIRST_WEIGHTS,
  "snake-deep": SNAKE_DEEP_WEIGHTS,
  "aim-first": AIM_FIRST_WEIGHTS,
  "aim-deep": AIM_DEEP_WEIGHTS,
  "lane-first": LANE_FIRST_WEIGHTS,
  "lane-deep": LANE_DEEP_WEIGHTS,
  "break-first": BREAK_FIRST_WEIGHTS,
  "break-deep": BREAK_DEEP_WEIGHTS,
};

/** Owned books a seat can show. The wallet balance is not in this list. */
export function publicOwnedBooks(ids: string[]) {
  const books: { id: string; name: string; how: string }[] = [];
  for (const id of ids) {
    const mark = markById(id);
    if (!mark) continue;
    books.push({ id: mark.id, name: mark.name, how: mark.how });
  }
  return books;
}

export function markById(id: string) {
  return HOUSE_MARKS.find((row) => row.id === id) ?? null;
}

export function priceLabel(cents: number) {
  return cents <= 0 ? "Free" : `${formatCents(cents)} USDT`;
}

/** Free and priced stay one sentence apart. */
export function freePricedLine() {
  return "A free file downloads. A priced file needs gold.";
}

/** Gold added for a sit returns to that sit once it covers the file. */
export function vaultReturnLine(enough: boolean) {
  return enough
    ? "Gold is on this sit. Take the file, or go back to the same book."
    : "This sit stays on the vault until gold is enough.";
}

export function publicMarks(owned: string[], snaps: Record<string, BookSnap> = {}): PublicMark[] {
  const have = new Set(owned);
  return HOUSE_MARKS.map((row) => {
    const live = snaps[row.id];
    return {
      ...row,
      bestLines: live?.bestLines ?? row.bestLines,
      games: live?.games ?? row.games,
      owned: row.priceCents <= 0 || have.has(row.id),
      priceLabel: row.status === "coming" ? "Coming" : priceLabel(row.priceCents),
    };
  });
}

export function weightsFor(id: string, snaps: Record<string, BookSnap> = {}): number[] | null {
  const mark = markById(id);
  if (!mark || mark.status !== "live") return null;
  const live = snaps[id]?.weights;
  if (live?.length) return [...live];
  const frozen = FROZEN[id];
  return frozen ? [...frozen] : null;
}

export function canPlayMark(mark: HouseMark) {
  return mark.status === "live";
}

/** Anyone may watch a live sit. Gold is only to take a priced file home. */
export function canWatchMark(mark: HouseMark) {
  return canPlayMark(mark);
}

export function canDownloadWeights(mark: HouseMark, owned: string[]) {
  if (mark.status !== "live") return false;
  if (mark.priceCents <= 0) return true;
  return owned.includes(mark.id);
}

/** Gold on the desk is only for a live priced sit on the well. */
export function deskShowsWallet(mark: { status: MarkStatus; priceCents: number } | null | undefined) {
  return Boolean(mark && mark.status === "live" && mark.priceCents > 0);
}

/** Cents still needed to take this priced sit home. Owned and free wells need nothing. */
export function deskSitNeed(
  mark: { status: MarkStatus; priceCents: number; owned?: boolean } | null | undefined,
) {
  if (!deskShowsWallet(mark) || mark?.owned) return 0;
  return mark?.priceCents ?? 0;
}

export function deskSitShort(balanceCents: number, needCents: number) {
  return needCents > 0 && balanceCents < needCents;
}

export function deskWalletNext(next: string) {
  return safeNext(next) || "/wait";
}

/** Live sit on a games-desk next path. Other doors keep no sit. */
export function sitFromNext(next: string) {
  const dest = safeNext(next);
  const cut = dest.indexOf("?");
  const path = (cut < 0 ? dest : dest.slice(0, cut)).replace(/\/+$/, "") || "/";
  if (path !== "/wait") return "";
  return sitParam(new URLSearchParams(cut < 0 ? "" : dest.slice(cut + 1)).get("sit"));
}

export function deskVaultHref(next: string) {
  const dest = deskWalletNext(next);
  const sit = sitFromNext(dest);
  return sit ? `/invest?sit=${sit}` : `/invest?next=${encodeURIComponent(dest)}`;
}

/** Guest → sign in. Short gold → the vault, with the sit still on the door. */
export function deskWalletHref(signedIn: boolean, balanceCents: number, needCents: number, next: string) {
  const dest = encodeURIComponent(deskWalletNext(next));
  if (!signedIn) return `/signin?next=${dest}`;
  if (deskSitShort(balanceCents, needCents)) return deskVaultHref(next);
  return "";
}

/** Same vault sit as the desk, opened from a store card. */
export function storeVaultHref(
  signedIn: boolean,
  balanceCents: number,
  mark: { id: string; status: MarkStatus; priceCents: number; owned?: boolean },
) {
  const sit = sitParam(mark.id);
  const need = deskSitNeed(mark);
  if (!sit || !need) return "";
  const vault = `/invest?sit=${sit}`;
  if (!signedIn) return `/signin?next=${encodeURIComponent(vault)}`;
  if (deskSitShort(balanceCents, need)) return vault;
  return "";
}

export function storeShortMark<T extends { id: string; status: MarkStatus; priceCents: number; owned?: boolean }>(
  marks: T[],
  signedIn: boolean,
  balanceCents: number,
) {
  return marks.find((mark) => Boolean(storeVaultHref(signedIn, balanceCents, mark))) ?? null;
}

/** Watching is free. The same vault sit opens when that priced book is short. */
export function watchVaultHref(
  signedIn: boolean,
  balanceCents: number,
  mark: { id: string; status: MarkStatus; priceCents: number; owned?: boolean },
) {
  return storeVaultHref(signedIn, balanceCents, mark);
}

export function watchVaultLine(signedIn: boolean) {
  return signedIn ? "Open wallet" : "Sign in to buy";
}

/** A short priced sit keeps its watch on the vault until gold is enough. */
export function vaultKeepsWatch(
  mark: { status: MarkStatus; priceCents: number; owned?: boolean } | null | undefined,
  balanceCents: number,
) {
  return deskSitShort(balanceCents, deskSitNeed(mark));
}

export function vaultSitLine(
  mark: { name: string; status: MarkStatus; priceCents: number; owned?: boolean },
  balanceCents: number,
) {
  const need = deskSitNeed(mark);
  if (!need) return `${mark.name} is on the desk.`;
  if (deskSitShort(balanceCents, need)) {
    return `${mark.name} · short ${formatCents(need - balanceCents)} USDT`;
  }
  return `${mark.name} · gold is enough`;
}

export function deskWalletLine(signedIn: boolean, balanceCents: number, needCents = 0) {
  if (!signedIn) return "A priced sit needs an account.";
  if (deskSitShort(balanceCents, needCents)) return `Wallet ${formatCents(balanceCents)} USDT · short`;
  return `Wallet ${formatCents(balanceCents)} USDT`;
}

export const MARK_FILTERS = ["all", "live", "coming", "free", "vault"] as const;
export type MarkFilter = (typeof MARK_FILTERS)[number];

export function filterMarks(rows: PublicMark[], filter: MarkFilter) {
  if (filter === "all") return rows;
  if (filter === "live") return rows.filter((row) => row.status === "live");
  if (filter === "free") return rows.filter((row) => row.status === "live" && row.priceCents <= 0);
  if (filter === "vault") return rows.filter((row) => row.priceCents > 0);
  return rows.filter((row) => row.status === "coming");
}

export function groupMarks(rows: PublicMark[]) {
  return MARK_GAMES.map((game) => ({
    ...game,
    rows: rows.filter((row) => row.kind === game.id),
  })).filter((game) => game.rows.length);
}
