import { COLORS } from "@/lib/colors";
import { seatHeadline, seatLabel, seatOf } from "@/lib/house-seats";
import type { PlayerRecord } from "@/lib/record";
import type { HallHome, NetworkCard, PublicRoomCard, PublicTake, User } from "@/lib/types";

const HOUSE_PITS = [
  { slug: "classic", name: "Classic Pit" },
  { slug: "lightning", name: "Lightning" },
  { slug: "duo", name: "Duo" },
  { slug: "high", name: "High Table" },
  { slug: "fog", name: "Fog Pit" },
  { slug: "night", name: "Night Pit" },
] as const;

const SIT_SLUGS = new Set<string>(HOUSE_PITS.map((room) => room.slug));

const DOOR_HOSTS = {
  x: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
  telegram: ["t.me", "www.t.me"],
  discord: ["discord.gg", "www.discord.gg", "discord.com", "www.discord.com"],
} as const;

export type SeatTaste = {
  sitSlug: string;
  hue: string;
  slugs: string[];
  location: string;
  seat: string;
};

export type SearchIntent = {
  text: string;
  color: string;
  slug: string;
};

export type SeatDoors = {
  x: string;
  telegram: string;
  discord: string;
};

export function emptyDoors(): SeatDoors {
  return { x: "", telegram: "", discord: "" };
}

export function sitSlugOf(user: User) {
  const slug = (user.sitSlug ?? "").trim().toLowerCase();
  return SIT_SLUGS.has(slug) ? slug : "";
}

export type LastPit = {
  slug: string;
  name: string;
  sitting: boolean;
};

export function lastPitOf(
  user: User,
  extras?: { sitting?: { slug: string; name: string } | null },
): LastPit | null {
  const sitting = extras?.sitting;
  if (sitting?.slug) {
    return { slug: sitting.slug, name: sitting.name, sitting: true };
  }
  const slug = sitSlugOf(user);
  if (!slug) return null;
  const pit = HOUSE_PITS.find((room) => room.slug === slug);
  return pit ? { slug: pit.slug, name: pit.name, sitting: false } : null;
}

export function composeHallHome(
  lastPit: HallHome["lastPit"],
  alike: HallHome["alike"],
): HallHome | null {
  const seats = alike.slice(0, 4);
  if (!lastPit && !seats.length) return null;
  return { lastPit, alike: seats };
}

export function doorsOf(user: User): SeatDoors {
  const raw = user.doors ?? {};
  return {
    x: typeof raw.x === "string" ? raw.x : "",
    telegram: typeof raw.telegram === "string" ? raw.telegram : "",
    discord: typeof raw.discord === "string" ? raw.discord : "",
  };
}

export function parseSitSlug(raw: unknown) {
  const slug = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!slug) return "";
  if (!SIT_SLUGS.has(slug)) throw new Error("Pick a house pit.");
  return slug;
}

export function parseDoor(kind: keyof SeatDoors, raw: unknown) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return "";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("That door is not a link the house can keep.");
  }
  if (url.protocol !== "https:") throw new Error("Doors out have to be https.");
  const host = url.hostname.toLowerCase();
  const hosts: readonly string[] = DOOR_HOSTS[kind];
  if (!hosts.includes(host)) {
    throw new Error("That door has to be X, Telegram, or Discord.");
  }
  if (kind === "discord" && host.endsWith("discord.com") && !url.pathname.startsWith("/invite/")) {
    throw new Error("A Discord door has to be an invite.");
  }
  return url.toString();
}

export function parseDoors(raw: unknown): SeatDoors {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    x: parseDoor("x", input.x),
    telegram: parseDoor("telegram", input.telegram),
    discord: parseDoor("discord", input.discord),
  };
}

export function parseSearchIntent(query: string): SearchIntent {
  const text = query.trim().toLowerCase();
  const color =
    COLORS.find(
      (item) => text === item.id || text === item.name.toLowerCase() || text.includes(item.name.toLowerCase()),
    )?.name ?? "";
  const slug =
    HOUSE_PITS.find(
      (room) =>
        text === room.slug ||
        text === room.name.toLowerCase() ||
        text.includes(room.slug) ||
        text.includes(room.name.toLowerCase()),
    )?.slug ?? "";
  return { text, color, slug };
}

export function tasteOf(
  user: User,
  extras?: { record?: PlayerRecord | null; takes?: PublicTake[]; sitting?: string },
): SeatTaste {
  const sitSlug = sitSlugOf(user);
  const sitting = extras?.sitting ?? "";
  const hue = (extras?.record?.hue ?? "").trim() || hueFromAvatar(user);
  const slugs = new Set<string>();
  if (sitSlug) slugs.add(sitSlug);
  if (sitting) slugs.add(sitting);
  for (const take of extras?.takes ?? []) {
    if (take.slug) slugs.add(take.slug);
  }
  return {
    sitSlug,
    hue,
    slugs: [...slugs],
    location: (user.location ?? "").trim().toLowerCase(),
    seat: seatOf(user.seat),
  };
}

function hueFromAvatar(user: User) {
  const avatar = (user.avatar ?? "").trim();
  if (!avatar.startsWith("hue:")) return "";
  return COLORS.find((color) => color.id === avatar.slice(4))?.name ?? "";
}

export function alikeWhy(yours: SeatTaste, theirs: SeatTaste, sameCompany = false): string {
  if (yours.seat && yours.seat === theirs.seat) {
    return `Same role · ${seatLabel(yours.seat)}`;
  }
  if (yours.sitSlug && yours.sitSlug === theirs.sitSlug) {
    return `Plays ${labelFor(yours.sitSlug)} too`;
  }
  const shared = yours.slugs.find((slug) => theirs.slugs.includes(slug));
  if (shared) return `Same table · ${labelFor(shared)}`;
  if (yours.hue && yours.hue === theirs.hue) return `Favours ${yours.hue} too`;
  if (sameCompany) return "Mutual connection";
  if (yours.location && yours.location === theirs.location) return "Same location";
  return "";
}

export function alikeScore(yours: SeatTaste, theirs: SeatTaste, sameCompany = false) {
  let score = 0;
  if (yours.seat && yours.seat === theirs.seat) score += 8;
  if (yours.sitSlug && yours.sitSlug === theirs.sitSlug) score += 4;
  const shared = yours.slugs.filter((slug) => theirs.slugs.includes(slug)).length;
  score += shared * 2;
  if (yours.hue && yours.hue === theirs.hue) score += 3;
  if (sameCompany) score += 2;
  if (yours.location && yours.location === theirs.location) score += 1;
  return score;
}

export function pitLabel(slug: string) {
  return HOUSE_PITS.find((room) => room.slug === slug)?.name.replace(/ Pit$/, "").replace(/ Table$/, "") ?? slug;
}

export function searchRooms(rooms: PublicRoomCard[], query: string) {
  const intent = parseSearchIntent(query);
  return rooms
    .map((room) => {
      const hay = `${room.name} ${room.slug} ${room.ownerName ?? ""}`.toLowerCase();
      let score = 0;
      if (!intent.text) score = 1;
      else if (hay.includes(intent.text)) score = 4;
      if (intent.slug && room.slug === intent.slug) score += 5;
      return { room, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.room.name.localeCompare(b.room.name))
    .slice(0, 12)
    .map((row) => row.room);
}

function labelFor(slug: string) {
  return pitLabel(slug);
}

export function seatMatchesQuery(user: User, intent: SearchIntent, taste: SeatTaste) {
  if (!intent.text) return false;
  const hay = [
    user.username,
    user.headline,
    user.about,
    user.location,
    taste.hue,
    taste.sitSlug,
    taste.seat,
    seatHeadline(taste.seat),
    ...taste.slugs,
  ]
    .join(" ")
    .toLowerCase();
  if (hay.includes(intent.text)) return true;
  if (intent.slug && (taste.sitSlug === intent.slug || taste.slugs.includes(intent.slug))) return true;
  if (intent.color && taste.hue.toLowerCase() === intent.color.toLowerCase()) return true;
  return false;
}

export function withWhy(card: NetworkCard, why: string): NetworkCard {
  return why ? { ...card, why } : card;
}
