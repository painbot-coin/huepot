import { colorsForCount, emptyColorCounts, type ColorId } from "./colors";
import {
  CLICK_PRICE,
  FOG_SECONDS,
  MAX_BUTTONS,
  MAX_CHAT,
  MAX_CLICK_PRICE,
  MAX_CUSTOM_ROOMS,
  MAX_LIVE_MINUTES,
  MAX_ROOM_NAME,
  MAX_ROUND_SECONDS,
  MIN_BUTTONS,
  MIN_CLICK_PRICE,
  MIN_LIVE_MINUTES,
  MIN_ROUND_SECONDS,
  ROUND_SECONDS,
} from "./config";
import { fromCents, toCents } from "./money";
import type { Room, RoomEvent, RoomEventKind, Round, StoreData } from "./types";

export type BasicRoomDef = {
  slug: string;
  name: string;
  buttonCount: number;
  clickPrice: number;
  roundSeconds: number;
  fogSeconds?: number | null;
  blurb: string;
};

export const BASIC_ROOMS: BasicRoomDef[] = [
  {
    slug: "classic",
    name: "Classic Pit",
    buttonCount: 4,
    clickPrice: CLICK_PRICE,
    roundSeconds: ROUND_SECONDS,
    blurb: "The public pit. Four coins, 1 USDT, one minute.",
  },
  {
    slug: "lightning",
    name: "Lightning",
    buttonCount: 4,
    clickPrice: CLICK_PRICE,
    roundSeconds: 15,
    blurb: "Same price, 15-second rounds.",
  },
  {
    slug: "duo",
    name: "Duo",
    buttonCount: 2,
    clickPrice: CLICK_PRICE,
    roundSeconds: 45,
    blurb: "Crimson vs Azure. Clean heads-up pot.",
  },
  {
    slug: "high",
    name: "High Table",
    buttonCount: 4,
    clickPrice: 5,
    roundSeconds: 60,
    blurb: "5 USDT a click. Same rules, heavier pot.",
  },
  {
    slug: "fog",
    name: "Fog Pit",
    buttonCount: 4,
    clickPrice: CLICK_PRICE,
    roundSeconds: ROUND_SECONDS,
    fogSeconds: FOG_SECONDS,
    blurb: "Classic rules. Last 12 seconds, the board goes dark.",
  },
];

export function isLiveFog(
  room: Pick<Room, "fogSeconds">,
  round: Pick<Round, "status" | "endsAt">,
  at = Date.now(),
) {
  const secs = room.fogSeconds;
  if (!secs || secs <= 0) return false;
  if (round.status !== "live") return false;
  return at >= round.endsAt - secs * 1000;
}

export function buttonIdsForCount(count: number): ColorId[] {
  return colorsForCount(count).map((color) => color.id);
}

function makeRoom(input: {
  slug: string;
  name: string;
  kind: Room["kind"];
  ownerId: string | null;
  buttonCount: number;
  clickPrice: number;
  roundSeconds: number;
  liveMinutes: number | null;
  fogSeconds?: number | null;
}): Room {
  const createdAt = Date.now();
  const liveMinutes = input.kind === "custom" ? input.liveMinutes : null;
  const closesAt =
    liveMinutes != null ? createdAt + liveMinutes * 60 * 1000 : null;
  const fogSeconds = input.fogSeconds && input.fogSeconds > 0 ? input.fogSeconds : null;
  const fogNote = fogSeconds
    ? ` Last ${fogSeconds} seconds, the board goes dark.`
    : "";
  return {
    id: input.slug,
    slug: input.slug,
    name: input.name,
    kind: input.kind,
    ownerId: input.ownerId,
    buttonCount: input.buttonCount,
    clickPrice: input.clickPrice,
    roundSeconds: input.roundSeconds,
    fogSeconds,
    createdAt,
    liveMinutes,
    closesAt,
    roundNumber: 0,
    round: null,
    playerIds: [],
    mutedIds: [],
    paused: false,
    pausedAt: null,
    slowMode: false,
    events: [
      {
        id: crypto.randomUUID(),
        kind: "system",
        userId: null,
        username: null,
        body: liveMinutes
          ? `${input.name} is open for ${liveMinutes} minutes, then this table is deleted. ${input.buttonCount} coins · ${fromCents(input.clickPrice)} USDT · ${input.roundSeconds}s rounds.${fogNote}`
          : `${input.name} is open. No table fee. ${input.buttonCount} coins · ${fromCents(input.clickPrice)} USDT · ${input.roundSeconds}s rounds.${fogNote}`,
        createdAt,
      },
    ],
  };
}

export function ensureRooms(store: StoreData) {
  if (!store.rooms) store.rooms = {};
  for (const def of BASIC_ROOMS) {
    const existing = store.rooms[def.slug];
    if (!existing) {
      store.rooms[def.slug] = makeRoom({
        slug: def.slug,
        name: def.name,
        kind: "basic",
        ownerId: null,
        buttonCount: def.buttonCount,
        clickPrice: toCents(def.clickPrice),
        roundSeconds: def.roundSeconds,
        liveMinutes: null,
        fogSeconds: def.fogSeconds ?? null,
      });
      continue;
    }
    existing.kind = "basic";
    existing.name = def.name;
    existing.buttonCount = def.buttonCount;
    existing.clickPrice = toCents(def.clickPrice);
    existing.roundSeconds = def.roundSeconds;
    existing.fogSeconds = def.fogSeconds ?? null;
    existing.events ??= [];
    existing.playerIds ??= [];
    existing.mutedIds ??= [];
    existing.paused ??= false;
    existing.pausedAt ??= null;
    existing.slowMode ??= false;
    if (existing.kind === "basic") {
      existing.liveMinutes = null;
      existing.closesAt = null;
    } else {
      existing.liveMinutes ??= 60;
      existing.closesAt ??= Date.now() + existing.liveMinutes * 60 * 1000;
    }
    if (existing.round) {
      existing.round.buttonIds =
        existing.round.buttonIds ?? buttonIdsForCount(existing.buttonCount);
      existing.round.totals = {
        ...emptyColorCounts(),
        ...existing.round.totals,
      };
    }
  }

  if (store.round && store.rooms.classic && !store.rooms.classic.round) {
    store.rooms.classic.round = {
      ...store.round,
      buttonIds: store.round.buttonIds ?? buttonIdsForCount(4),
      clickPrice: store.round.clickPrice || toCents(CLICK_PRICE),
    };
    store.rooms.classic.roundNumber = store.roundNumber || store.round.number;
    store.round = null;
  }

  for (const room of Object.values(store.rooms)) {
    room.mutedIds ??= [];
    room.paused ??= false;
    room.pausedAt ??= null;
    room.slowMode ??= false;
    room.fogSeconds ??= null;
  }
}

export function findRoom(store: StoreData, slug: string) {
  ensureRooms(store);
  const room = store.rooms[slug];
  if (!room) {
    const error = new Error("That room is not open.");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  return room;
}

export function isQuietRoundLine(body: string) {
  return /had no clicks/.test(body) || /is live\.?$/.test(body);
}

export function postRoomEvent(
  room: Room,
  input: {
    kind: RoomEventKind;
    body: string;
    userId?: string | null;
    username?: string | null;
  },
) {
  room.events.push({
    id: crypto.randomUUID(),
    kind: input.kind,
    userId: input.userId ?? null,
    username: input.username ?? null,
    body: input.body,
    createdAt: Date.now(),
  });
  room.events = room.events.slice(-120);
}

export function slugifyRoomName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18) || "table";
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

export function parseRoomDraft(input: {
  name?: string;
  buttonCount?: number;
  clickPrice?: number;
  roundSeconds?: number;
  liveMinutes?: number;
  fog?: boolean;
  fogSeconds?: number | null;
}) {
  const name = (input.name ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 3 || name.length > MAX_ROOM_NAME) {
    throw new Error(`Room name must be 3–${MAX_ROOM_NAME} characters.`);
  }
  const buttonCount = Number(input.buttonCount);
  if (
    !Number.isInteger(buttonCount) ||
    buttonCount < MIN_BUTTONS ||
    buttonCount > MAX_BUTTONS
  ) {
    throw new Error(`Pick ${MIN_BUTTONS} to ${MAX_BUTTONS} coins.`);
  }
  const clickPrice = toCents(Number(input.clickPrice));
  if (
    !Number.isFinite(clickPrice) ||
    clickPrice < toCents(MIN_CLICK_PRICE) ||
    clickPrice > toCents(MAX_CLICK_PRICE)
  ) {
    throw new Error(`Click price must be ${MIN_CLICK_PRICE}–${MAX_CLICK_PRICE} USDT.`);
  }
  const roundSeconds = Number(input.roundSeconds);
  if (
    !Number.isInteger(roundSeconds) ||
    roundSeconds < MIN_ROUND_SECONDS ||
    roundSeconds > MAX_ROUND_SECONDS
  ) {
    throw new Error(`Round time must be ${MIN_ROUND_SECONDS}–${MAX_ROUND_SECONDS} seconds.`);
  }
  const liveMinutes = Number(input.liveMinutes);
  if (
    !Number.isInteger(liveMinutes) ||
    liveMinutes < MIN_LIVE_MINUTES ||
    liveMinutes > MAX_LIVE_MINUTES
  ) {
    throw new Error(`Table live time must be ${MIN_LIVE_MINUTES}–${MAX_LIVE_MINUTES} minutes.`);
  }
  const wantsFog = Boolean(input.fog) || Number(input.fogSeconds) > 0;
  return {
    name,
    buttonCount,
    clickPrice,
    roundSeconds,
    liveMinutes,
    fogSeconds: wantsFog ? FOG_SECONDS : null,
  };
}

export function createCustomRoom(
  store: StoreData,
  ownerId: string,
  input: {
    name?: string;
    buttonCount?: number;
    clickPrice?: number;
    roundSeconds?: number;
    liveMinutes?: number;
    fog?: boolean;
    fogSeconds?: number | null;
  },
) {
  ensureRooms(store);
  const customCount = Object.values(store.rooms).filter((room) => room.kind === "custom").length;
  if (customCount >= MAX_CUSTOM_ROOMS) {
    throw new Error("Custom room list is full. Join an open table.");
  }
  const draft = parseRoomDraft(input);
  const slug = slugifyRoomName(draft.name);
  const room = makeRoom({
    slug,
    name: draft.name,
    kind: "custom",
    ownerId,
    buttonCount: draft.buttonCount,
    clickPrice: draft.clickPrice,
    roundSeconds: draft.roundSeconds,
    liveMinutes: draft.liveMinutes,
    fogSeconds: draft.fogSeconds,
  });
  store.rooms[slug] = room;
  const owner = store.users[ownerId];
  postRoomEvent(room, {
    kind: "system",
    userId: ownerId,
    username: owner?.username ?? null,
    body: `${owner?.username ?? "A player"} opened this table for ${draft.liveMinutes} minutes. Then it is deleted.`,
  });
  return room;
}

export function parseChat(body: unknown) {
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) throw new Error("Write a message first.");
  if (text.length > MAX_CHAT) throw new Error(`Keep chat under ${MAX_CHAT} characters.`);
  return text
    .replace(/\bhttps?:\/\/\S+/gi, "…")
    .replace(/\bwww\.\S+/gi, "…");
}
