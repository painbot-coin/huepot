/**
 * Versus Tetris player types the house can actually sit.
 * This well has no T-spin table, no badges, and no NES tap.
 * Style is the reward and the pick — same six features, different skill.
 */

export const STACK_STYLE_IDS = [
  "live",
  "down",
  "clean",
  "tank",
  "burst",
  "press",
  "cheese",
  "combo",
  "speed",
  "tech",
  "all",
] as const;

export type StackStyleId = (typeof STACK_STYLE_IDS)[number];

export type StackStyle = {
  id: StackStyleId;
  markId: string;
  name: string;
  playerType: string;
  role: "live" | "defender" | "attacker" | "speed" | "allround";
  how: string;
  tags: string[];
  priceCents: number;
  games: number;
  houseMs?: number;
};

export const STACK_STYLES: StackStyle[] = [
  {
    id: "live",
    markId: "wait-live",
    name: "The open stack",
    playerType: "All-rounder",
    role: "live",
    how: "Learns on this well. Down stays low. Burst takes a four. A lock moves these weights.",
    tags: ["stack", "live", "all-rounder", "TD", "free"],
    priceCents: 0,
    games: 0,
  },
  {
    id: "down",
    markId: "wait-down",
    name: "Downstacker",
    playerType: "Fast line reducer",
    role: "defender",
    how: "Keeps the well low and clears. Survives. May not send much.",
    tags: ["stack", "defender", "downstack", "TD", "free"],
    priceCents: 0,
    games: 240,
  },
  {
    id: "clean",
    markId: "wait-clean",
    name: "Clean stacker",
    playerType: "Clean stacker",
    role: "defender",
    how: "Keeps a flat, hole-free well. Always ready to downstack or counter.",
    tags: ["stack", "defender", "clean", "TD", "free"],
    priceCents: 0,
    games: 220,
  },
  {
    id: "tank",
    markId: "wait-tank",
    name: "Survivor",
    playerType: "Tank / survivalist",
    role: "defender",
    how: "Plays safe and stays low. Tries to outlast rather than out-send.",
    tags: ["stack", "defender", "survive", "TD", "free"],
    priceCents: 0,
    games: 200,
  },
  {
    id: "burst",
    markId: "wait-burst",
    name: "Burst attacker",
    playerType: "Huge sender",
    role: "attacker",
    how: "Holds a well, then dumps a four. A spike, not a drip. Send still caps at two.",
    tags: ["stack", "attacker", "burst", "TD", "vault"],
    priceCents: 250,
    games: 280,
  },
  {
    id: "press",
    markId: "wait-press",
    name: "Sustained attacker",
    playerType: "Sustained attacker",
    role: "attacker",
    how: "Constant pressure. Doubles and triples over one big hit.",
    tags: ["stack", "attacker", "pressure", "TD", "vault"],
    priceCents: 200,
    games: 240,
  },
  {
    id: "cheese",
    markId: "wait-cheese",
    name: "Harasser",
    playerType: "Cheeser / harasser",
    role: "attacker",
    how: "Small awkward sends. Prefers singles and doubles to mess the other well.",
    tags: ["stack", "attacker", "cheese", "TD", "free"],
    priceCents: 0,
    games: 200,
  },
  {
    id: "combo",
    markId: "wait-combo",
    name: "Combo sit",
    playerType: "4-wide / combo",
    role: "attacker",
    how: "Keeps a deep well and chains clears. Combo pressure, not a one-shot.",
    tags: ["stack", "attacker", "combo", "TD", "vault"],
    priceCents: 250,
    games: 260,
  },
  {
    id: "speed",
    markId: "wait-speed",
    name: "Speed sit",
    playerType: "Speed demon",
    role: "speed",
    how: "Simple locks, any clear. Raw pace. Does not wait for a four.",
    tags: ["stack", "speed", "TD", "free"],
    priceCents: 0,
    games: 180,
    houseMs: 88,
  },
  {
    id: "tech",
    markId: "wait-tech",
    name: "Technical sit",
    playerType: "Efficiency player",
    role: "speed",
    how: "Lower pace, higher damage per piece. Waits for a three or a four.",
    tags: ["stack", "efficiency", "TD", "vault"],
    priceCents: 300,
    games: 280,
    houseMs: 170,
  },
  {
    id: "all",
    markId: "wait-all",
    name: "All-rounder",
    playerType: "All-rounder",
    role: "allround",
    how: "Balanced speed, attack, and downstack. The scariest ordinary sit.",
    tags: ["stack", "all-rounder", "TD", "vault"],
    priceCents: 200,
    games: 320,
  },
];

const BY_MARK = new Map(STACK_STYLES.map((row) => [row.markId, row]));
const BY_ID = new Map(STACK_STYLES.map((row) => [row.id, row]));

export function stackStyleByMark(id: string) {
  return BY_MARK.get(id) ?? STACK_STYLES[0]!;
}

export function stackStyleById(id: StackStyleId) {
  return BY_ID.get(id) ?? STACK_STYLES[0]!;
}

export function isStackStyleId(value: string): value is StackStyleId {
  return BY_ID.has(value as StackStyleId);
}

export function weightsFile(data: {
  name?: string;
  playerType?: string;
  how?: string;
  games?: number;
  features?: string[];
  weights?: number[];
  watchScore?: number;
  watchNote?: string;
  style?: string;
}) {
  const weights = (data.weights ?? []).map((w) => (Number.isFinite(w) ? w.toFixed(4) : "0"));
  const watch =
    typeof data.watchScore === "number"
      ? `Watch: ${data.watchScore}${data.watchNote ? ` · ${data.watchNote}` : ""}`
      : "";
  return [
    "Huepot trained model",
    `Name: ${data.name || "stack"}`,
    `Player type: ${data.playerType || "stack"}`,
    `How it sits: ${data.how || "A stack sit."}`,
    data.style ? `Style: ${data.style}` : "",
    watch,
    data.games ? `Trained: ${data.games} games` : "",
    "Features (what it looks at):",
    `  ${(data.features ?? []).join(", ") || "bias, height, holes, bump, peak, wells"}`,
    "Weights (the model's numbers. Open this in any text editor.):",
    `  ${weights.join("  ")}`,
    "",
  ]
    .filter((line, i, all) => line !== "" || i === all.length - 1)
    .join("\n");
}
