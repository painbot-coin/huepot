/**
 * What counts as betting-game news on this house.
 *
 * A match report is not it. A Bitcoin price is not it. An operator buying
 * another operator is not it, and neither is their stock award. The tape
 * is for people who bet on games:
 * odds and lines, a new table, a poker series, a handle number, a market
 * that just opened.
 */

export type BettingKind = "sport" | "casino";
export type BettingTrust = "house" | "strict";

const GAME =
  /\b(bet|bets|betting|bettor|bettors|wager|wagers|odds|sportsbook|sportsbooks|moneyline|moneylines|spread|spreads|parlay|parlays|prop bets?|player props?|over\/?under|underdog|favourites?|favorites?|handle|bookmaker|bookie|puck line|run line|vegas line|closing line|against the spread|\bATS\b|futures odds|bet builder|accumulator|each-way|each way|prediction market|kalshi|polymarket|draftkings|fanduel|betmgm|caesars|pointsbet|bet365)\b/i;

const CASINO =
  /\b(casino|casinos|slot|slots|poker|blackjack|roulette|baccarat|craps|jackpot|progressive|live dealer|table game|wsop|wpt|spin.?and.?go|crash game|plinko|scratch card)\b/i;

const AFFILIATE = [
  // "5 Best Online Poker Sites" and "Best NFL Betting Promos" — a word or two
  // between Best and the product is how the real listicles are titled.
  /\b(best|top)\s+.{0,40}\b(online\s+|live\s+dealer\s+)?(betting|casino|poker|sportsbook)s?(\s+sites?)?\b/i,
  /\b(betting|sportsbook|casino|nfl|nba|mlb|nhl|ncaa)\s+(betting\s+)?promos?\b/i,
  /\b(promo|bonus)\s+codes?\b/i,
  /\bwelcome bonus\b/i,
  /\bsign[- ]up offer\b/i,
  /\btop-rated\b/i,
  /\bbest time to play\b/i,
  /\bclaim\s+(over\s+)?\$/i,
  /\bbet\s+\$\d+[^.!?]{0,24}get\s+\$/i,
];

const TIPSTER = /\b(lock of the day|guaranteed wins?|100\s?% sure|telegram (tips|channel))\b/i;

const COIN_PRICE = /\b(bitcoin|btc|ethereum|eth|crypto\s*(price|etf)|spot etf)\b/i;

/**
 * Who bought whom, who sued whom, who handed staff stock. A betting desk
 * publishes that beat; a player here is reading a game. "Casinos" in a
 * company name is enough for a strict scrape to keep an HR story, so this
 * has to be refused even when the word casino is in the title.
 */
const OPERATOR = [
  /\b(stock award|stock grant|\$\d+\s*m(?:illion)?\s+stock)\b/i,
  /\b(merger|acquires?|acquisition|buyout|ipo)\b/i,
  /\b(injunction|lawsuit|legal (action|offensive|fight)|class action)\b/i,
  /\b(regulator|legislation|earnings|revenue)\b/i,
  /\bviral ad\b/i,
  /\bteam members?\b.{0,24}\bstock\b/i,
];

/** Odds, a market, a price. What the hall should show a stranger. */
const HALL_LINE =
  /\b(odds|moneyline|moneylines|spread|spreads|parlay|parlays|prop bets?|player props?|over\/?under|puck line|run line|vegas line|closing line|opening line|against the spread|\bATS\b|implied|opens? as|\d+\s*\/\s*\d+)\b/i;

/** A new table or a series, same idea for casino desks. */
const HALL_TABLE =
  /\b((launches?|unveils?|releases?)\b.{0,48}\b(slot|slots|poker|table game|live dealer)|(new (slot|poker room|table game)|wsop|wpt|live dealer))\b/i;

function hay(title: string, summary: string) {
  return `${title} ${summary}`;
}

/** Affiliate listicles, operator press, and "lock of the day" are not the wire. */
export function isBettingSpam(title: string, summary = "") {
  const text = hay(title, summary);
  return (
    AFFILIATE.some((rule) => rule.test(text)) ||
    OPERATOR.some((rule) => rule.test(text)) ||
    TIPSTER.test(text) ||
    COIN_PRICE.test(text)
  );
}

/**
 * The four chips under the lintel. A tip sheet can stay on the wire; the
 * hall should read as a game being priced, not as a signup offer or a
 * "lock of the week".
 */
export function isHallLine(title: string, summary = "") {
  if (isBettingSpam(title, summary)) return false;
  const text = hay(title, summary);
  return HALL_LINE.test(text) || HALL_TABLE.test(text);
}

export function bettingGameKind(
  title: string,
  summary = "",
  fallback: BettingKind = "sport",
): BettingKind {
  const text = hay(title, summary);
  if (CASINO.test(text)) return "casino";
  if (GAME.test(text)) return "sport";
  return fallback;
}

/**
 * house — a betting desk. Take what they publish unless it is spam.
 * strict — a mixed scrape (the tape). Must read as a betting game.
 */
export function isBettingGameNews(
  title: string,
  summary = "",
  trust: BettingTrust = "strict",
) {
  if (!title.trim()) return false;
  if (isBettingSpam(title, summary)) return false;
  if (trust === "house") return true;
  const text = hay(title, summary);
  return GAME.test(text) || CASINO.test(text);
}

/**
 * Topic scrapes arrive as "Headline - Publisher". The publisher is already
 * stored on the card, so it comes off the headline.
 */
export function wireHeadline(raw: string, publisher = "") {
  const title = raw.replace(/\s+/g, " ").trim();
  if (publisher) {
    const suffix = ` - ${publisher}`;
    if (title.endsWith(suffix)) return title.slice(0, -suffix.length).trim();
  }
  const dash = title.lastIndexOf(" - ");
  if (dash >= 24) return title.slice(0, dash).trim();
  return title;
}
