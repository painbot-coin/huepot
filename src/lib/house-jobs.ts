/**
 * Work Huepot is actually looking for.
 * Posted by Huepot, not a freelance board. Apply from an account.
 * USDT is not a hiring budget. The pot stays on Classic.
 */

import { parseProjectHref } from "@/lib/seat-project-public";
import { seatOf, seatTag, type HouseSeatId } from "@/lib/house-seats";

export const NOTE_MIN = 12;
export const NOTE_MAX = 400;
export const BID_CAP = 200;

export type HouseJobSeat =
  | HouseSeatId
  | "any"
  | "design"
  | "backend"
  | "architect"
  | "ml"
  | "market";

export type HouseJob = {
  id: string;
  title: string;
  seat: HouseJobSeat;
  need: string;
  how: string[];
  stayOff: string[];
};

export type BidStatus = "open" | "shortlist" | "passed";

export type HouseBid = {
  id: string;
  jobId: string;
  userId: string;
  username: string;
  seat: string;
  note: string;
  href: string;
  createdAt: number;
  status?: BidStatus;
};

export const HOUSE_JOBS: HouseJob[] = [
  {
    id: "design",
    title: "UI/UX designer",
    seat: "design",
    need: "The layout has a sidebar and a main stage. Games and live tables stay full-screen. Huepot still needs someone to own how it reads.",
    how: [
      "Review Home, Games, Wallet, Jobs, and a live Classic table. Keep one layout: sticky top, left shortcuts, a main stage, and a right rail.",
      "Games stay immersive. A live table stays a table. Do not flatten them into the social chrome.",
      "Phones use the bottom dock. Guest and signed-in have to stay honest. Link work you have already shipped.",
    ],
    stayOff: [
      "Do not add a deposit-bonus banner or a casino-generic skin.",
      "Do not invent a HUE/USDT ticker on the floor. USDT is not a hiring budget.",
    ],
  },
  {
    id: "backend",
    title: "Backend engineer",
    seat: "backend",
    need: "One process owns the store. Money, models, applications, and roles already run. Huepot needs someone who can keep that lane honest.",
    how: [
      "Own the API and the SQLite store. Reads and writes share the same lock. A second next-server is a different app.",
      "Cash stays USDT on BNB Chain. Play credits are play-only. HUE is standing, not money.",
      "Game models are tiny text files. Play stays free. USDT only buys a priced file.",
    ],
    stayOff: [
      "Do not add a HUE/USDT pool or a second lifetime ranking.",
      "Do not split Huepot across two processes. Do not invent a USDT salary on the job.",
    ],
  },
  {
    id: "architect",
    title: "System architect",
    seat: "architect",
    need: "One server. One next-server. A deploy that swaps a finished build. Huepot needs someone who can keep that ceiling visible.",
    how: [
      "Keep Huepot a single process on the box. Build off to the side, swap once, keep the previous build for rollback.",
      "Name the next wall before we hit it. The store is one lane by design.",
      "Games are a reinforcement-learning lab. The pot stays on Classic.",
    ],
    stayOff: [
      "Do not invent mainnet HUE, a second ranking, or a second app on the box.",
      "Do not restore an in-house chat desk. Official Chatzy stays.",
    ],
  },
  {
    id: "ml",
    title: "Machine learning engineer",
    seat: "ml",
    need: "Game models are tiny TD files. All six games are live. Huepot still needs someone who can train a stronger model without leaving the product.",
    how: [
      "Play Stack, Catch, Snake, Aim, Lane, and Break. House vs house. Play free. USDT only buys the trained file.",
      "A house model is a small text file. Train the open model or share a stronger one on the store.",
      "Not Counter-Strike. Not Dota. Bricks are bricks. Link a model you have already trained.",
    ],
    stayOff: [
      "Do not rehost 30–365 MB third-party nets.",
      "Do not list or sell CS2, Valorant, Apex, Fortnite, PUBG, or Roblox overlay files.",
    ],
  },
  {
    id: "market",
    title: "Marketing specialist",
    seat: "market",
    need: "An empty Classic table kills every other door. The four roles still need someone who can tell the truth about Huepot.",
    how: [
      "Point a first click at a living Classic table. 18+ only. Play what you can afford.",
      "Game, AI, play, and betting meet here. Invite is rake share only. Cash-out talk stays honest.",
      "Share a real win, a real game session, or a real job. Link work you have already shipped.",
    ],
    stayOff: [
      "Do not offer a deposit bonus. Do not invent wins, rooms, or a USDT salary.",
      "Do not sell Huepot as Counter-Strike or Dota. Official Chatzy stays. Support is mailto only.",
    ],
  },
  {
    id: "lane",
    title: "Train Lane",
    seat: "ai",
    need: "Lane is live. The last-hit model still wants a trainer who works here.",
    how: [
      "Play Lane in Games. Not Dota. Last-hit the mark before the well takes it.",
      "Train the open model. Play free. USDT only buys the trained file.",
      "Share a stronger model on the store or on your profile project.",
    ],
    stayOff: [
      "Do not copy Dota, name heroes, or sell overlays.",
      "Do not add a HUE/USDT pool.",
    ],
  },
  {
    id: "break",
    title: "Train Break",
    seat: "ai",
    need: "Break is live. The brick model still wants a trainer who works here.",
    how: [
      "Play Break in Games. Bounce the ball off the pad into the bricks.",
      "Train the open model. Play free. USDT only buys the trained file.",
      "Share a stronger model on the store or on your profile project.",
    ],
    stayOff: [
      "Do not rehost a third-party brick net.",
      "The pot stays on Classic.",
    ],
  },
  {
    id: "books",
    title: "Train a house model",
    seat: "ai",
    need: "Stack, Catch, Snake, Aim, Lane, and Break are live. The models still want a trainer who works here.",
    how: [
      "Train a small model for a live game. All six games are on the table.",
      "A house model is a small text file. Play stays free.",
      "Share the trained file on the store or on your profile project.",
    ],
    stayOff: [
      "Do not rehost 30–365 MB third-party nets.",
      "Do not list or sell CS2, Valorant, Apex, Fortnite, PUBG, or Roblox overlay files.",
    ],
  },
  {
    id: "classic",
    title: "Host Classic hour",
    seat: "better",
    need: "An empty Classic table kills every other door. Huepot needs a named hour that is live.",
    how: [
      "Play Classic at 20:00 UTC so a first click lands on a living table.",
      "Tell the network when the hour is on. Invite is rake share only.",
      "Keep cash-out talk honest. Same-day send is the habit.",
    ],
    stayOff: [
      "Do not offer a deposit bonus.",
      "Sit chips are play-only and not withdrawable. HUE is standing, not money.",
    ],
  },
  {
    id: "shelf",
    title: "Share a project",
    seat: "game",
    need: "Huepot put four links on the store. Members can still share their own.",
    how: [
      "Put a game or a model on your profile. Games, models, play, and Classic already sit.",
      "USDT is only to buy a priced file.",
      "Game and AI roles both fit. The pot stays on Classic.",
    ],
    stayOff: [
      "Do not invent a second marketplace or a cash rate for HUE.",
      "Outbound links stay on https.",
    ],
  },
  {
    id: "review",
    title: "Roster the report desk",
    seat: "any",
    need: "Reports already group by who was named. The desk needs named keepers.",
    how: [
      "Read open reports so one irritated player is distinguishable from a pattern.",
      "Stay on Huepot. Hide what should be hidden. Dismiss what is noise.",
      "Any role can join the report roster. A manager adds you. Reviewers read reports on /manage.",
    ],
    stayOff: [
      "Do not restore an in-house chat desk. Official Chatzy stays.",
      "Do not invent a second moderation product.",
    ],
  },
];

export function listHouseJobs() {
  return HOUSE_JOBS;
}

export type DeskWork = {
  id: string;
  name: string;
  how: string;
  seat: string;
  username: string;
  /** A free door. A priced door stays off this desk. */
  href: string;
};

/** Seats who shared work. The house is not a seat. Gold is not on the line. */
export function deskWork(
  rows: {
    id: string;
    name: string;
    how: string;
    seat: string;
    username: string;
    href: string;
    userId?: string;
    priceCents?: number;
  }[],
): DeskWork[] {
  const work: DeskWork[] = [];
  for (const row of rows) {
    const username = row.username.trim();
    const id = (row.userId ?? "").trim().toLowerCase();
    if (!username || username.toLowerCase() === "house" || id === "house") continue;
    work.push({
      id: row.id,
      name: row.name,
      how: row.how,
      seat: row.seat,
      username,
      href: (row.priceCents ?? 0) > 0 ? "" : row.href,
    });
  }
  return work;
}

export function jobById(id: string) {
  const clean = id.trim().toLowerCase();
  return HOUSE_JOBS.find((job) => job.id === clean) ?? null;
}

export function jobSeatLabel(seat: HouseJobSeat) {
  if (seat === "any") return "Any role";
  if (seat === "design") return "UI/UX";
  if (seat === "backend") return "Backend";
  if (seat === "architect") return "Architect";
  if (seat === "ml") return "ML";
  if (seat === "market") return "Marketing";
  return seatTag(seat) || "Role";
}

export function cleanBidNote(raw: unknown) {
  const note = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (note.length < NOTE_MIN) throw new Error("Tell us how you would do this job.");
  return note.slice(0, NOTE_MAX);
}

export function cleanBidHref(raw: unknown) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return "";
  return parseProjectHref(value);
}

export function parseBidStatus(raw: unknown): BidStatus {
  const status = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (status === "open" || status === "shortlist" || status === "passed") return status;
  throw new Error("Pick open, shortlist, or passed.");
}

export function bidStatusOf(row: HouseBid): BidStatus {
  return row.status === "shortlist" || row.status === "passed" ? row.status : "open";
}

export function publicBid(row: HouseBid) {
  return {
    id: row.id,
    jobId: row.jobId,
    username: row.username,
    seat: row.seat,
    note: row.note,
    href: row.href,
    createdAt: row.createdAt,
    status: bidStatusOf(row),
  };
}

export function applicationNotice(kind: "new" | "update", title: string) {
  if (kind === "update") {
    return {
      title: "Application updated",
      body: `Your application for ${title} was replaced.`,
    };
  }
  return {
    title: "Huepot has your application",
    body: `You applied for ${title}.`,
  };
}

/** Newest first. A seat reads its own applications, not everyone else's. */
export function applicationsOf(rows: HouseBid[], userId: string) {
  return Object.values(yoursOn(rows, userId))
    .map((row) => {
      const job = jobById(row.jobId);
      return { ...row, title: job?.title ?? row.jobId };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function yoursOn(rows: HouseBid[], userId: string) {
  const map: Record<string, HouseBid> = {};
  for (const row of rows) {
    if (row.userId === userId) map[row.jobId] = row;
  }
  return map;
}

export function countOn(rows: HouseBid[], jobId: string) {
  return rows.filter((row) => row.jobId === jobId).length;
}

export function placeBidOn(
  rows: HouseBid[],
  input: {
    jobId: string;
    userId: string;
    username: string;
    seat?: string | null;
    note: unknown;
    href?: unknown;
    now?: number;
  },
) {
  const job = jobById(input.jobId);
  if (!job) throw new Error("That job was not found.");
  const note = cleanBidNote(input.note);
  const href = cleanBidHref(input.href);
  const at = input.now ?? Date.now();
  const next = rows.filter((row) => !(row.jobId === job.id && row.userId === input.userId));
  const bid: HouseBid = {
    id: crypto.randomUUID(),
    jobId: job.id,
    userId: input.userId,
    username: input.username,
    seat: seatOf(input.seat),
    note,
    href,
    createdAt: at,
    status: "open",
  };
  next.unshift(bid);
  return { rows: next.slice(0, BID_CAP), bid };
}

export function setBidStatusOn(rows: HouseBid[], id: string, status: unknown) {
  const clean = (id ?? "").trim();
  if (!clean) throw new Error("Pick an application.");
  const nextStatus = parseBidStatus(status);
  const found = rows.find((row) => row.id === clean);
  if (!found) throw new Error("That application was not found.");
  return {
    rows: rows.map((row) => (row.id === found.id ? { ...row, status: nextStatus } : row)),
    bid: { ...found, status: nextStatus },
  };
}

/** Newest first. The hiring desk reads every application. */
export function manageApplicationsOf(rows: HouseBid[]) {
  return [...rows]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((row) => {
      const job = jobById(row.jobId);
      return {
        ...publicBid(row),
        title: job?.title ?? row.jobId,
      };
    });
}

export function takeBidFrom(rows: HouseBid[], userId: string, jobId: string) {
  const job = jobById(jobId);
  if (!job) throw new Error("That job was not found.");
  const found = rows.find((row) => row.jobId === job.id && row.userId === userId);
  if (!found) throw new Error("You have no application on this job.");
  return {
    rows: rows.filter((row) => row.id !== found.id),
    bid: found,
  };
}
