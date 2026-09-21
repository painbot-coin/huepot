// Tries candidate feeds and reports which are worth adding.
//
// Run from the droplet so the result reflects what production can actually
// reach. Every source in NEWS_SOURCES answered this probe before being added;
// guessing at a URL and shipping it is how a wire ends up quietly half dead.

const CANDIDATES = [
  ["Sports betting tape", "https://news.google.com/rss/search?q=sports+betting+odds&hl=en-US&gl=US&ceid=US:en"],
  ["Casino games tape", "https://news.google.com/rss/search?q=%22slot+launch%22+OR+WSOP+OR+%22poker+tournament%22+OR+%22live+dealer%22+OR+%22new+slot%22&hl=en-US&gl=US&ceid=US:en"],
  ["NY Post Betting", "https://nypost.com/tag/sports-betting/feed/"],
  ["CBS Sports Betting", "https://www.cbssports.com/rss/headlines/betting/"],
  ["Legal Sports Report", "https://www.legalsportsreport.com/feed/"],
  ["Legal Sports Betting", "https://www.legalsportsbetting.com/feed/"],
  ["Sports Betting Dime", "https://www.sportsbettingdime.com/feed/"],
  ["Betfair", "https://betting.betfair.com/index.xml"],
  ["Casino.org", "https://www.casino.org/news/feed/"],
  ["Punter2Pro", "https://punter2pro.com/feed/"],
  ["VegasSlotsOnline", "https://www.vegasslotsonline.com/news/feed/"],
  ["OnlinePoker", "https://www.onlinepoker.net/feed/"],
  ["CasinoBeats", "https://casinobeats.com/feed/"],
  ["SBC News", "https://sbcnews.co.uk/feed/"],
];

const AGENT = "HuepotNewsBot/1.0 (+https://huepot.net)";

function items(xml) {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  return blocks.map((block) => {
    const t = block.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i);
    const inner = t ? t[1] : "";
    const cdata = inner.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    const title = (cdata ? cdata[1] : inner).replace(/\s+/g, " ").trim();
    const hasDesc = /<(description|summary)[\s>]/i.test(block);
    const hasImg =
      /<media:(content|thumbnail)[^>]*url=/i.test(block) ||
      /<enclosure[^>]*url=/i.test(block) ||
      /<img[^>]*src=/i.test(block);
    return { title, hasDesc, hasImg };
  });
}

for (const [name, url] of CANDIDATES) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": AGENT, accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    if (!res.ok) {
      console.log(`  ${name.padEnd(24)} http ${res.status}`);
      continue;
    }
    const xml = await res.text();
    const list = items(xml);
    if (!list.length) {
      console.log(`  ${name.padEnd(24)} ok but no items parsed (${xml.length} bytes)`);
      continue;
    }
    const withDesc = list.filter((i) => i.hasDesc).length;
    const withImg = list.filter((i) => i.hasImg).length;
    console.log(
      `  ${name.padEnd(24)} ${String(list.length).padStart(3)} items, ${withDesc} with a summary, ${withImg} with a picture`,
    );
    console.log(`     e.g. ${list[0].title.slice(0, 78)}`);
  } catch (error) {
    console.log(`  ${name.padEnd(24)} failed: ${String(error.message).slice(0, 54)}`);
  }
}
