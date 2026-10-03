export type HallId = "classic" | "lightning" | "duo" | "high" | "fog" | "night" | "wheel" | "dice";

export type HallCharacter = {
  slug: HallId;
  kicker: string;
  enter: string;
  calm: string;
  clock: string;
  material: string;
  hour?: string;
  cup?: string;
};

export function eventSoon(startAt: number, now = Date.now()) {
  const left = startAt - now;
  return left > 0 && left <= 15 * 60 * 1000;
}

export const HALLS: Record<HallId, HallCharacter> = {
  classic: {
    slug: "classic",
    kicker: "Public table",
    enter: "Four coins. One minute. Huepot meets here.",
    calm: "Classic is open.",
    clock: "Time",
    material: "#d4af6a",
    hour: "Classic hour is on.",
  },
  lightning: {
    slug: "lightning",
    kicker: "Fast table",
    enter: "Same price. Fifteen seconds.",
    calm: "Lightning is live.",
    clock: "Time",
    material: "#ffb020",
  },
  duo: {
    slug: "duo",
    kicker: "Heads-up",
    enter: "Crimson against Azure. Nothing else.",
    calm: "Duo is open.",
    clock: "Time",
    material: "#2ea8ff",
  },
  high: {
    slug: "high",
    kicker: "High table",
    enter: "Five USDT a click. Same rule.",
    calm: "High Table is open.",
    clock: "Time",
    material: "#ffe08a",
  },
  fog: {
    slug: "fog",
    kicker: "Fog table",
    enter: "Last twelve seconds, the board goes dark.",
    calm: "Fog is open.",
    clock: "Time",
    material: "#c9c4d8",
    cup: "Fog cup is on.",
  },
  night: {
    slug: "night",
    kicker: "Night table",
    enter: "Fifteen seconds. Last eight, the board goes dark.",
    calm: "Night is open.",
    clock: "Time",
    material: "#6a7cff",
    hour: "Night hour is on.",
  },
  wheel: {
    slug: "wheel",
    kicker: "Wheel",
    enter: "Eight pockets. The biggest takes the pot.",
    calm: "Wheel is open.",
    clock: "Time",
    material: "#ff6a2a",
  },
  dice: {
    slug: "dice",
    kicker: "Dice",
    enter: "Six faces. The biggest takes the pot.",
    calm: "Dice is open.",
    clock: "Time",
    material: "#3dffb0",
  },
};

export function hallFor(slug: string): HallCharacter | null {
  if (
    slug === "classic" ||
    slug === "lightning" ||
    slug === "duo" ||
    slug === "high" ||
    slug === "fog" ||
    slug === "night" ||
    slug === "wheel" ||
    slug === "dice"
  ) {
    return HALLS[slug];
  }
  return null;
}

export function hallClass(slug: string) {
  return hallFor(slug) ? `is-hall-${slug}` : "is-hall-guest";
}
