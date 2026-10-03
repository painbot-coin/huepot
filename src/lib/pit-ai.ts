/**
 * A linear action-value book for a color pot.
 *
 * Q(s, a) = w · φ(s, a). The house does not sit a real pit.
 * A sit of the book is a watch. No USDT. The pot stays on the pit.
 */

export const PIT_FEATURES = ["bias", "share", "lead", "gap", "time", "dark"] as const;
export const PIT_FEATURE_COUNT = PIT_FEATURES.length;

export type PitKind = "classic" | "lightning" | "duo" | "high" | "fog" | "night";

export type PitRules = {
  kind: PitKind;
  coins: number;
  seconds: number;
  fogSeconds: number;
};

export const PIT_RULES: Record<PitKind, PitRules> = {
  classic: { kind: "classic", coins: 4, seconds: 60, fogSeconds: 0 },
  lightning: { kind: "lightning", coins: 4, seconds: 15, fogSeconds: 0 },
  duo: { kind: "duo", coins: 2, seconds: 45, fogSeconds: 0 },
  high: { kind: "high", coins: 4, seconds: 60, fogSeconds: 0 },
  fog: { kind: "fog", coins: 4, seconds: 60, fogSeconds: 12 },
  night: { kind: "night", coins: 4, seconds: 15, fogSeconds: 8 },
};

export function emptyCounts(coins: number) {
  return Array.from({ length: coins }, () => 0);
}

export function featuresOf(
  seen: number[],
  remaining: number,
  seconds: number,
  dark: boolean,
  action: number,
) {
  const total = seen.reduce((sum, n) => sum + n, 0);
  const mine = seen[action] ?? 0;
  const max = Math.max(...seen, 0);
  const share = total ? mine / total : 0;
  const lead = total > 0 && mine >= max ? 1 : 0;
  const gap = max ? (max - mine) / max : 0;
  const time = seconds ? remaining / seconds : 0;
  return [1, share, lead, gap, time, dark ? 1 : 0];
}

export function scoreOf(phi: number[], weights: number[]) {
  let sum = 0;
  for (let i = 0; i < PIT_FEATURE_COUNT; i++) sum += (weights[i] ?? 0) * (phi[i] ?? 0);
  return sum;
}

export function scoresOf(
  seen: number[],
  remaining: number,
  seconds: number,
  dark: boolean,
  weights: number[],
) {
  return seen.map((_, action) =>
    scoreOf(featuresOf(seen, remaining, seconds, dark, action), weights),
  );
}

export function readPick(
  seen: number[],
  remaining: number,
  seconds: number,
  dark: boolean,
  weights: number[],
  action: number,
) {
  const phi = featuresOf(seen, remaining, seconds, dark, action);
  const parts = PIT_FEATURES.map((name, i) => ({
    name,
    value: phi[i] ?? 0,
    weight: weights[i] ?? 0,
    pull: (weights[i] ?? 0) * (phi[i] ?? 0),
  }));
  return { phi, parts, score: scoreOf(phi, weights) };
}

export function pickColor(
  seen: number[],
  remaining: number,
  seconds: number,
  dark: boolean,
  weights: number[],
  rng?: () => number,
) {
  const scores = scoresOf(seen, remaining, seconds, dark, weights);
  let best = 0;
  let bestScore = -Infinity;
  const jitter = rng ? rng() * 1e-6 : 0;
  for (let i = 0; i < scores.length; i++) {
    const score = (scores[i] ?? -Infinity) + (i === 0 ? jitter : 0);
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  return { action: best, scores };
}

export function crowdPick(seen: number[], rng: () => number) {
  const max = Math.max(...seen, 0);
  const leaders = seen.map((n, i) => (n === max ? i : -1)).filter((i) => i >= 0);
  const roll = rng();
  if (seen.some((n) => n > 0) && roll < 0.58 && leaders.length) {
    return leaders[Math.floor(rng() * leaders.length)] ?? 0;
  }
  return Math.floor(rng() * seen.length);
}

export function winnersOf(counts: number[]) {
  const max = Math.max(...counts, 0);
  if (max <= 0) return [];
  const win = counts.map((n, i) => (n === max ? i : -1)).filter((i) => i >= 0);
  return win.length === 1 ? win : [];
}

export function totalsOf(sides: number[][]) {
  const coins = sides[0]?.length ?? 0;
  return Array.from({ length: coins }, (_, i) => sides.reduce((sum, side) => sum + (side[i] ?? 0), 0));
}

export function settleLine(
  counts: number[],
  you: number[],
  house: number[],
  names: string[],
  watch: boolean,
) {
  const win = winnersOf(counts);
  if (!win.length) return "A tie comes back. Nobody took.";
  const name = names[win[0]!] ?? "that color";
  const yours = you[win[0]!] ?? 0;
  const theirs = house[win[0]!] ?? 0;
  if (watch) {
    if (yours === theirs) return `Both houses sat ${name}.`;
    return yours > theirs ? `West sat ${name}.` : `East sat ${name}.`;
  }
  if (yours > theirs) return `You sat ${name}.`;
  if (theirs > yours) return `The book sat ${name}.`;
  return `You and the book both sat ${name}.`;
}

export function rewardOf(counts: number[], mine: number[]) {
  const spent = mine.reduce((sum, n) => sum + n, 0);
  if (!spent) return -0.4;
  const win = winnersOf(counts);
  if (!win.length) return 0;
  return (mine[win[0]!] ?? 0) / spent * 2 - 1;
}

export function tdStep(weights: number[], phi: number[], target: number, alpha = 0.04) {
  const next = [...weights];
  const delta = target - scoreOf(phi, weights);
  for (let i = 0; i < PIT_FEATURE_COUNT; i++) {
    next[i] = (next[i] ?? 0) + alpha * delta * (phi[i] ?? 0);
  }
  return next;
}

export function makePitRng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function freshPitSeed() {
  return (Math.floor(Math.random() * 0xffffffff) || 1) >>> 0;
}

export function sitRound(
  rules: PitRules,
  weights: number[],
  rng: () => number,
  learn = false,
) {
  let book = [...weights];
  const counts = emptyCounts(rules.coins);
  const mine = emptyCounts(rules.coins);
  let seen = emptyCounts(rules.coins);
  let lastPhi: number[] | null = null;
  for (let left = rules.seconds; left > 0; left--) {
    const dark = rules.fogSeconds > 0 && left <= rules.fogSeconds;
    if (!dark) seen = [...counts];
    const crowd = rules.seconds <= 15 ? 2 : 3;
    for (let i = 0; i < crowd; i++) counts[crowdPick(seen, rng)] += 1;
    if (learn && rng() < 0.12) {
      const wander = Math.floor(rng() * rules.coins);
      counts[wander] += 1;
      mine[wander] += 1;
      lastPhi = featuresOf(seen, left, rules.seconds, dark, wander);
      continue;
    }
    const pick = pickColor(seen, left, rules.seconds, dark, book);
    counts[pick.action] += 1;
    mine[pick.action] += 1;
    const phi = featuresOf(seen, left, rules.seconds, dark, pick.action);
    if (learn && lastPhi) {
      const next = Math.max(...scoresOf(seen, Math.max(0, left - 1), rules.seconds, dark, book));
      book = tdStep(book, lastPhi, 0.97 * next);
    }
    lastPhi = phi;
  }
  const reward = rewardOf(counts, mine);
  if (learn && lastPhi) book = tdStep(book, lastPhi, reward);
  return { counts, mine, reward, win: winnersOf(counts), weights: book };
}

export function clipBook(weights: number[]) {
  return [
    weights[0] ?? 0.15,
    Math.max(0.05, weights[1] ?? 0.4),
    Math.max(0.05, weights[2] ?? 0.5),
    Math.min(-0.05, weights[3] ?? -0.3),
    weights[4] ?? 0.1,
    Math.max(0, weights[5] ?? 0.15),
  ];
}

export function trainBook(rules: PitRules, games: number, seed: number) {
  const rng = makePitRng(seed);
  let weights = clipBook([0.18, 1.05, 1.25, -0.9, 0.2, rules.fogSeconds ? 0.4 : 0.12]);
  let hits = 0;
  for (let i = 0; i < games; i++) {
    const sit = sitRound(rules, weights, rng, true);
    weights = clipBook(sit.weights);
    if (sit.reward > 0) hits += 1;
  }
  return { weights, hits, games };
}
