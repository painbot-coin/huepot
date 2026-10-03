/**
 * The house talks about itself, three times a UTC day.
 *
 * Each line is a door that already exists. A restart posts the slots already
 * due today and leaves yesterday alone, so a boot cannot invent a backlog.
 */

export const HOUSE_DAY_SLOTS = [0, 8, 16] as const;

const LINES = [
  {
    title: "Classic",
    body: "Same price on every color. Biggest color takes the rest. The pot stays on Classic.",
    href: "/rooms/classic",
  },
  {
    title: "The hour",
    body: "The clock names the hour. Night and Fog change the table only while they are on.",
    href: "/rooms/classic",
  },
  {
    title: "Games",
    body: "Sit a book on the desk, then take the file from the store. Down stays low. Burst takes a four. Catch covers both sides. Snake counts food. Aim closes the flick. Lane waits for the ripe mark. Break clears a wall.",
    href: "/wait",
  },
  {
    title: "The store",
    body: "A free file downloads. A priced file needs gold. The card shows the watch. The file is that book.",
    href: "/wait/store",
  },
  {
    title: "The vault",
    body: "Gold added for a priced book stays on that sit. USDT buys a priced file, not a bonus.",
    href: "/invest",
  },
  {
    title: "A seat",
    body: "A profile shows takes, hues, and owned books. Balance stays on the vault.",
    href: "/network",
  },
  {
    title: "Letters",
    body: "A letter stays a letter.",
    href: "/network",
  },
  {
    title: "Jobs",
    body: "Jobs stay the house desk. Read free. Apply from an account.",
    href: "/jobs",
  },
  {
    title: "Fairness",
    body: "The last take opens its checks in one step.",
    href: "/fairness",
  },
  {
    title: "The house",
    body: "Game, AI, play, and betting — same house.",
    href: "/how-it-works",
  },
] as const;

export type HouseDayPost = {
  id: string;
  title: string;
  body: string;
  href: string;
  at: number;
};

export function houseDayKey(at: number) {
  const date = new Date(at);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}${month}${day}`;
}

function dayIndex(at: number) {
  const date = new Date(at);
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
}

/** Slots whose hour has arrived today. Tomorrow is a new set of ids. */
export function houseDayPlan(at = Date.now()): HouseDayPost[] {
  const date = new Date(at);
  const hour = date.getUTCHours();
  const key = houseDayKey(at);
  const start = dayIndex(at) % LINES.length;
  const dayStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const posts: HouseDayPost[] = [];
  HOUSE_DAY_SLOTS.forEach((slot, index) => {
    if (hour < slot) return;
    const line = LINES[(start + index) % LINES.length]!;
    posts.push({
      id: `house-${key}-${slot}`,
      title: line.title,
      body: line.body,
      href: line.href,
      at: dayStart + slot * 3_600_000,
    });
  });
  return posts;
}

export async function postDueHouseDay(at = Date.now()) {
  const plan = houseDayPlan(at);
  if (!plan.length) return 0;
  const { prisma } = await import("@/lib/db");
  const { HOUSE_USER_ID, ensureHouseUser } = await import("@/lib/house");
  const { ensureSocialTables } = await import("@/lib/social");
  const { withStore } = await import("@/lib/store");
  await ensureSocialTables();
  await withStore((store) => {
    ensureHouseUser(store);
  });
  let posted = 0;
  for (const row of plan) {
    const done = await prisma.$executeRaw`
      INSERT OR IGNORE INTO NetworkPost
        (id, userId, body, link, image, title, source, createdAt, kind)
      VALUES (${row.id}, ${HOUSE_USER_ID}, ${row.body}, ${row.href}, '',
              ${row.title}, 'Huepot', ${row.at}, '')
    `;
    posted += Number(done);
  }
  return posted;
}

let timer: NodeJS.Timeout | null = null;

export function startHouseDayWatcher() {
  if (timer) return;
  const run = () => {
    void postDueHouseDay().catch(() => undefined);
  };
  setTimeout(run, 25_000);
  timer = setInterval(run, 15 * 60 * 1000);
}
