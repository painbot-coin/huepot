/**
 * What the wire will and will not take.
 *
 * The scrapers used to gather football scores and Bitcoin prices because
 * those feeds answered. This is the check that the replacement actually
 * selects betting games.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  bettingGameKind,
  isBettingGameNews,
  isBettingSpam,
  isHallLine,
  wireHeadline,
} from "@/lib/betting-game";
import { cleanUrl, parseFeed, talkHref, type NewsSource } from "@/lib/news";

const desk: NewsSource = {
  name: "NY Post Betting",
  url: "https://nypost.com/tag/sports-betting/feed/",
  tag: "sport",
  trust: "house",
};

const tape: NewsSource = {
  name: "Sports betting tape",
  url: "https://news.google.com/rss/search?q=sports+betting+odds",
  tag: "sport",
  trust: "strict",
  wire: true,
  take: 8,
};

test("odds and lines are betting-game news", () => {
  assert.equal(isBettingGameNews("Lions vs. Saints betting odds: Detroit opens as favorite"), true);
  assert.equal(isBettingGameNews("NFL Betting Projections Hit $30 Billion"), true);
  assert.equal(bettingGameKind("NFL Week 1 player props and odds"), "sport");
});

test("a new slot or a poker series is a betting game", () => {
  assert.equal(isBettingGameNews("NetEnt Launches Demon Beats Slot"), true);
  assert.equal(isBettingGameNews("Caesars Palace opens new poker room in Las Vegas"), true);
  assert.equal(bettingGameKind("Push Gaming Launches Flaming Streaks slot"), "casino");
});

test("a match report and a coin price are not", () => {
  assert.equal(isBettingGameNews("Sean McVay Offers Intriguing Aaron Donald Update"), false);
  assert.equal(isBettingGameNews("Bitcoin climbs as spot ETF inflows return"), false);
  assert.equal(isBettingGameNews("Champions League live updates: Latest news"), false);
});

test("a betting desk may publish a preview without saying odds", () => {
  assert.equal(
    isBettingGameNews("Sabalenka, Pegula Meet At US Open For Third Straight Year", "", "house"),
    true,
  );
  assert.equal(
    isBettingGameNews("Sabalenka, Pegula Meet At US Open For Third Straight Year", "", "strict"),
    false,
  );
});

test("affiliate listicles and lock-of-the-day tips are spam", () => {
  assert.equal(isBettingSpam("5 Best Online Poker Sites for Real Money"), true);
  assert.equal(isBettingSpam("7 Best Live Dealer Casinos and Games in the US"), true);
  assert.equal(isBettingSpam("Lock of the day: take the over"), true);
  assert.equal(isBettingGameNews("5 Best Online Poker Sites for Real Money", "", "house"), false);
  assert.equal(isBettingSpam("Best NFL Betting Promos for Week 1: Sportsbook Promos, Bonus Codes"), true);
  assert.equal(isBettingSpam("Best Saints Sportsbook Promos: Claim Over $3,000 for Saints Odds"), true);
  assert.equal(isBettingSpam("bet365 bonus code: Bet $10, get $365 in bonus bets for Rams vs. 49ers"), true);
  assert.equal(isBettingSpam("Best Time to Play US Online Slots in September 2026"), true);
});

test("operator press and a celebrity ad are not a betting game", () => {
  assert.equal(
    isBettingSpam("Station Casinos ‘Takes Care of Team Members’ With $70M Stock Award"),
    true,
  );
  assert.equal(
    isBettingSpam("Underdog Escalates Prediction Markets Fight With Five-State Legal Offensive"),
    true,
  );
  assert.equal(
    isBettingSpam(
      "Why ‘uncomfortable’ Sydney Sweeney approached prediction market to strip down for viral ad",
    ),
    true,
  );
  assert.equal(
    isBettingGameNews("Station Casinos ‘Takes Care of Team Members’ With $70M Stock Award", "", "house"),
    false,
  );
  assert.equal(isBettingGameNews("Caesars Palace opens new poker room in Las Vegas", "", "house"), true);
  assert.equal(isBettingGameNews("NFL Betting Projections Hit $30 Billion"), true);
});

test("a priced game still belongs on the hall", () => {
  assert.equal(isHallLine("Lions vs. Saints betting odds: Detroit opens as favorite"), true);
  assert.equal(isHallLine("Champions League Thursday Tips: Back 7/2 Kane at the double"), true);
  assert.equal(isHallLine("NFL Week 1 player props and touchdown scorers"), true);
  assert.equal(isHallLine("NetEnt Launches Demon Beats Slot"), true);
  assert.equal(isHallLine("Best NFL Betting Promos for Week 1"), false);
  assert.equal(isHallLine("Underdog Escalates Prediction Markets Fight With Five-State Legal Offensive"), false);
  assert.equal(isBettingGameNews("NFL Betting Projections Hit $30 Billion"), true);
  assert.equal(isBettingSpam("Best MLB Home Run Odds & Prop Picks Today"), false);
});

test("a topic scrape drops the publisher off the headline", () => {
  assert.equal(
    wireHeadline("Lions vs. Saints betting odds: Detroit opens as Week 1 favorites - Lions Wire", "Lions Wire"),
    "Lions vs. Saints betting odds: Detroit opens as Week 1 favorites",
  );
});

test("the tape parser keeps betting games and names the desk", () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item>
      <title>Lions vs. Saints betting odds: Detroit opens as favorites - Lions Wire</title>
      <link>https://news.google.com/rss/articles/abc?oc=5</link>
      <guid isPermaLink="false">abc</guid>
      <source url="https://lionswire.com">Lions Wire</source>
    </item>
    <item>
      <title>Champions League live updates: Latest news - The Athletic</title>
      <link>https://news.google.com/rss/articles/zzz?oc=5</link>
      <source url="https://nytimes.com">The Athletic</source>
    </item>
    <item>
      <title>5 Best Online Poker Sites for Real Money - Muddy River</title>
      <link>https://news.google.com/rss/articles/aff?oc=5</link>
      <source url="https://example.com">Muddy River</source>
    </item>
  </channel></rss>`;
  const items = parseFeed(xml, tape);
  assert.equal(items.length, 1);
  assert.equal(items[0].source, "Lions Wire");
  assert.equal(items[0].title, "Lions vs. Saints betting odds: Detroit opens as favorites");
  assert.equal(items[0].tag, "sport");
  assert.equal(items[0].summary, "");
});

test("a desk feed keeps a betting preview and drops a coin story", () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item>
      <title>Patriots vs. Seahawks prediction: NFL Week 1 picks, odds, bets</title>
      <link>https://nypost.com/2026/09/09/sports/pats-seahawks/</link>
      <description>Odds, props and a side.</description>
    </item>
    <item>
      <title>Bitcoin climbs as spot ETF inflows return</title>
      <link>https://nypost.com/2026/09/09/business/btc/</link>
      <description>Markets.</description>
    </item>
  </channel></rss>`;
  const items = parseFeed(xml, desk);
  assert.equal(items.length, 1);
  assert.equal(items[0].source, "NY Post Betting");
  assert.match(items[0].title, /Patriots/);
});

test("a WordPress credit is not the summary", () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item>
      <title>NetEnt Launches Demon Beats Slot</title>
      <link>https://www.vegasslotsonline.com/news/demon-beats/</link>
      <description>A new avalanche slot. The post NetEnt Launches Demon Beats Slot appeared first on Vegas Slots Online News.</description>
    </item>
  </channel></rss>`;
  const items = parseFeed(xml, {
    name: "VegasSlotsOnline",
    url: "https://www.vegasslotsonline.com/news/feed/",
    tag: "casino",
    trust: "house",
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].summary, "A new avalanche slot.");
});

test("tracking parameters do not make a new article", () => {
  assert.equal(
    cleanUrl("https://nypost.com/story?utm_source=rss&utm_medium=feed"),
    "https://nypost.com/story",
  );
});

test("Talk only accepts a house post id", () => {
  assert.equal(talkHref("wire-abc"), "/network?post=wire-abc");
  assert.equal(talkHref("wire-abc'; DROP"), "/network?post=wire-abcDROP");
  assert.equal(talkHref("https://evil.example/x"), "");
});
