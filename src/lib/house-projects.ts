/**
 * Real links Huepot puts on the store first.
 * Members can still share their own. USDT only buys a priced file.
 */

import type { HouseSeatId } from "@/lib/house-seats";
import { parseProjectHref, type SeatProject } from "@/lib/seat-project-public";

export const HOUSE_PROJECT_OWNER = "house";

export type HouseProjectSpec = {
  id: string;
  seat: HouseSeatId;
  name: string;
  how: string;
  path: string;
};

export const HOUSE_PROJECT_SPECS: HouseProjectSpec[] = [
  {
    id: "house-wait",
    seat: "game",
    name: "Games lab",
    how: "Six games. Play free against house bots. USDT only buys a priced file.",
    path: "/wait",
  },
  {
    id: "house-books",
    seat: "ai",
    name: "AI models",
    how: "Small training files for Stack, Catch, Snake, Aim, Lane, and Break.",
    path: "/wait/store",
  },
  {
    id: "house-play",
    seat: "gamer",
    name: "Play games",
    how: "Play against Huepot bots. Play stays free.",
    path: "/wait",
  },
  {
    id: "house-classic",
    seat: "better",
    name: "Classic table",
    how: "The public table. An empty pot waits for the first player.",
    path: "/rooms/classic",
  },
];

export function houseProjectDoor(path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return parseProjectHref(`https://huepot.net${clean}`);
}

export function missingHouseProjects(rows: { id: string; userId: string }[]) {
  const have = new Set(
    rows.filter((row) => row.userId === HOUSE_PROJECT_OWNER).map((row) => row.id),
  );
  return HOUSE_PROJECT_SPECS.filter((spec) => !have.has(spec.id));
}

export function houseProjectRow(spec: HouseProjectSpec, createdAt: number): SeatProject {
  return {
    id: spec.id,
    userId: HOUSE_PROJECT_OWNER,
    seat: spec.seat,
    name: spec.name,
    how: spec.how,
    href: houseProjectDoor(spec.path),
    priceCents: 0,
    createdAt,
  };
}

export function seedHouseProjects(rows: SeatProject[]) {
  const missing = missingHouseProjects(rows);
  let next = rows;
  if (missing.length) {
    next = [...rows];
    for (const spec of missing) {
      const index = HOUSE_PROJECT_SPECS.findIndex((row) => row.id === spec.id);
      next.push(houseProjectRow(spec, index + 1));
    }
  }
  const refreshed = next.map((row) => {
    if (row.userId !== HOUSE_PROJECT_OWNER) return row;
    const spec = HOUSE_PROJECT_SPECS.find((item) => item.id === row.id);
    if (!spec) return row;
    const href = houseProjectDoor(spec.path);
    if (
      row.name === spec.name &&
      row.how === spec.how &&
      row.seat === spec.seat &&
      row.href === href
    ) {
      return row;
    }
    return { ...row, name: spec.name, how: spec.how, seat: spec.seat, href };
  });
  if (refreshed.some((row, index) => row !== next[index])) return refreshed;
  return next === rows ? rows : next;
}
