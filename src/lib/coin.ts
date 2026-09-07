/**
 * HUE — the house coin.
 *
 * Earned from real play and derived from `Tx` rows, never stored as its own
 * balance. That means it is retroactive, cannot drift from what a seat
 * actually did, and cannot be minted by mistake.
 *
 * HUE is standing, not money. It has no USDT rate, it is not withdrawable and
 * it buys nothing priced in USDT. Giving it a cash value or a payout would
 * change what it legally is — a token drawing value from a gambling house's
 * revenue is treated as a security in many places. Keep that decision out of
 * this file.
 */

export const HUE_PER_CLICK = 1;
export const HUE_PER_TAKE = 10;

export type CoinRank = {
  name: string;
  at: number;
};

/** House voice, cheapest first. A seat sits in the last rank it has reached. */
export const HUE_RANKS: CoinRank[] = [
  { name: "Unmarked", at: 0 },
  { name: "Seated", at: 10 },
  { name: "Marked", at: 50 },
  { name: "Gilded", at: 150 },
  { name: "Gold-handed", at: 400 },
  { name: "House name", at: 1000 },
];

export function hueEarned(input: {
  clicks: number;
  takes: number;
  /** Lifetime task bonus, already summed over past days and weeks. */
  bonus?: number;
}) {
  const clicks = Math.max(0, Math.floor(input.clicks || 0));
  const takes = Math.max(0, Math.floor(input.takes || 0));
  const bonus = Math.max(0, Math.floor(input.bonus || 0));
  return clicks * HUE_PER_CLICK + takes * HUE_PER_TAKE + bonus;
}

export function rankFor(hue: number): CoinRank {
  let rank = HUE_RANKS[0]!;
  for (const step of HUE_RANKS) {
    if (hue >= step.at) rank = step;
  }
  return rank;
}

/** Level is the rank's position, so there is one progression, not two. */
export function levelFor(hue: number) {
  const rank = rankFor(hue);
  const index = HUE_RANKS.findIndex((step) => step.name === rank.name);
  return { level: index + 1, title: rank.name, of: HUE_RANKS.length };
}

/** The next rank up, or null once a seat has reached the last one. */
export function nextRankFor(hue: number): CoinRank | null {
  return HUE_RANKS.find((step) => step.at > hue) ?? null;
}

export function hueRule() {
  return `${HUE_PER_CLICK} HUE a click, ${HUE_PER_TAKE} HUE a take.`;
}
