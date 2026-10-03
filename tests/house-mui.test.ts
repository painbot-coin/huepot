import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  HOUSE_AMBER,
  HOUSE_BG,
  HOUSE_FIRE,
  HOUSE_GOLD,
  HOUSE_INK,
  HOUSE_LIGHT_BG,
  HOUSE_LIGHT_FIRE,
  HOUSE_LIGHT_PAPER,
  HOUSE_MUTED,
  isThemeMode,
  THEME_MODE_KEY,
  THEME_MODES,
} from "@/lib/house-mui";
import { newsDeskChips, newsHref } from "@/lib/news-href";
import theme from "@/theme";

test("the house sits on earth and wood, not black, white, or silver", () => {
  assert.equal(HOUSE_BG, "#16140f");
  assert.equal(HOUSE_INK, "#f3efe4");
  assert.equal(HOUSE_GOLD, "#8ee4a8");
  assert.equal(HOUSE_AMBER, "#2f9e62");
  assert.equal(HOUSE_FIRE, "#a84b32");
  assert.equal(HOUSE_LIGHT_FIRE, "#8b2e3b");
  assert.equal(HOUSE_LIGHT_BG, "#efe6d2");
  assert.equal(HOUSE_LIGHT_PAPER, "#f7f1e4");
  assert.equal(HOUSE_MUTED, "#9a8b74");
  assert.doesNotMatch(HOUSE_BG, /#070614|#000000|#ffffff|#1976d2|#9c27b0/i);
  assert.doesNotMatch(HOUSE_LIGHT_PAPER, /#ffffff|#070614/i);
  assert.doesNotMatch(HOUSE_MUTED, /#8f8f9c|#9a9aa8|#c9c9d4/i);
  assert.doesNotMatch(HOUSE_GOLD, /#1976d2|#9c27b0|#ffd27a|#ffb020/i);
  assert.doesNotMatch(HOUSE_AMBER, /#ffd27a|#ffb020|#1976d2|#9c27b0/i);
  assert.deepEqual([...THEME_MODES], ["light", "dark", "system"]);
  assert.equal(THEME_MODE_KEY, "mui-mode");
  assert.equal(isThemeMode("light"), true);
  assert.equal(isThemeMode("gold"), false);
  const schemes = (
    theme as {
      colorSchemes?: {
        light?: {
          palette: {
            primary: { main: string };
            secondary: { main: string };
            background: { default: string; paper: string };
          };
        };
        dark?: { palette: { primary: { main: string }; background: { default: string } } };
      };
    }
  ).colorSchemes;
  assert.equal(schemes?.light?.palette.primary.main, HOUSE_AMBER);
  assert.equal(schemes?.light?.palette.secondary.main, HOUSE_LIGHT_FIRE);
  assert.equal(schemes?.light?.palette.background.paper, HOUSE_LIGHT_PAPER);
  assert.equal(schemes?.dark?.palette.primary.main, HOUSE_AMBER);
  assert.equal(schemes?.dark?.palette.background.default, HOUSE_BG);
  assert.doesNotMatch(schemes?.light?.palette.primary.main ?? "", /#1976d2|#9c27b0/i);
});

test("wait and account sit on the shared floor, not leftover shells", () => {
  const wait = readFileSync(new URL("../src/app/wait/page.tsx", import.meta.url), "utf8");
  const store = readFileSync(new URL("../src/app/wait/store/page.tsx", import.meta.url), "utf8");
  const account = readFileSync(new URL("../src/components/AccountClient.tsx", import.meta.url), "utf8");
  assert.match(wait, /HouseFloor/);
  assert.doesNotMatch(wait, /is-wait/);
  assert.match(wait, /Sit a book here, then take the file from the store/);
  assert.match(wait, /A watch on a priced book stays on that vault sit until gold is enough/);
  assert.match(store, /A watch on a priced book stays on that vault sit until gold is enough/);
  const shelf = readFileSync(new URL("../src/components/WaitStore.tsx", import.meta.url), "utf8");
  const pick = readFileSync(new URL("../src/components/WaitPick.tsx", import.meta.url), "utf8");
  const take = readFileSync(new URL("../src/components/DeskTake.tsx", import.meta.url), "utf8");
  const bank = readFileSync(new URL("../src/components/DeskBank.tsx", import.meta.url), "utf8");
  const desk = readFileSync(new URL("../src/components/WaitDesk.tsx", import.meta.url), "utf8");
  const play = readFileSync(new URL("../src/lib/wait-play.ts", import.meta.url), "utf8");
  assert.match(shelf, /Sit this book/);
  assert.match(shelf, /deskHref/);
  assert.match(shelf, /storeVaultHref/);
  assert.match(shelf, /Open wallet/);
  assert.match(shelf, /watchVaultHref/);
  const watch = readFileSync(new URL("../src/components/WatchSit.tsx", import.meta.url), "utf8");
  assert.match(watch, /wait-watch-vault/);
  assert.match(watch, /vaultLine/);
  assert.match(pick, /DeskTake/);
  assert.match(pick, /key=\{picked\.id\}/);
  assert.match(take, /Take this file/);
  assert.match(take, /seen === mark\.id/);
  const dock = readFileSync(new URL("../src/components/HouseDock.tsx", import.meta.url), "utf8");
  const sit = readFileSync(new URL("../src/components/use-desk-sit.ts", import.meta.url), "utf8");
  const deskBody = readFileSync(new URL("../src/components/WaitDesk.tsx", import.meta.url), "utf8");
  const marksDoor = readFileSync(new URL("../src/app/api/wait/marks/route.ts", import.meta.url), "utf8");
  const profile = readFileSync(new URL("../src/app/network/u/[username]/page.tsx", import.meta.url), "utf8");
  const close = readFileSync(new URL("../src/app/api/account/close/route.ts", import.meta.url), "utf8");
  assert.match(dock, /\/wait\/store/);
  assert.match(sit, /deskPair\(kind, sit\)/);
  assert.match(deskBody, /setGame\(deskKind\(book\)\)/);
  assert.match(marksDoor, /grantMark/);
  assert.match(marksDoor, /paidMarkOnBooks/);
  assert.match(profile, /\/network\/u\/\$\{encodeURIComponent/);
  assert.match(close, /hasOpenCashOut/);
  assert.match(take, /fetchDownload/);
  assert.match(take, /signin\?next=/);
  assert.match(take, /deskShowsWallet/);
  assert.match(take, /Open wallet/);
  assert.match(take, /deskWalletHref/);
  assert.match(bank, /deskWalletLine/);
  assert.match(bank, /deskWalletHref/);
  assert.match(desk, /DeskBank/);
  const invest = readFileSync(new URL("../src/app/invest/page.tsx", import.meta.url), "utf8");
  const vault = readFileSync(new URL("../src/components/InvestClient.tsx", import.meta.url), "utf8");
  assert.match(invest, /sitFromNext/);
  assert.match(invest, /invest\?sit=/);
  assert.match(vault, /vaultSitLine/);
  assert.match(vault, /vaultKeepsWatch/);
  assert.match(vault, /WatchSit/);
  assert.match(vault, /fetchWatch/);
  assert.match(vault, /DeskTake/);
  assert.match(vault, /This priced sit stays here until gold is enough/);
  assert.match(play, /take: "download"/);
  assert.match(account, /HouseFloor/);
  assert.doesNotMatch(account, /house-shell/);
  const notices = readFileSync(new URL("../src/components/NotificationsClient.tsx", import.meta.url), "utf8");
  const bell = readFileSync(new URL("../src/components/NotificationBell.tsx", import.meta.url), "utf8");
  assert.match(notices, /notice-desk/);
  assert.match(notices, /noticeAlertClass/);
  assert.match(notices, /title="Alerts"/);
  assert.match(bell, /notice-tray/);
  assert.match(bell, /See all alerts/);
});

test("house chrome is green, while Lightning and Amber stay yellow", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const themeSrc = readFileSync(new URL("../src/theme.ts", import.meta.url), "utf8");
  assert.match(css, /--house-green: #2f9e62;/);
  assert.match(css, /--house-earth: #efe6d2;/);
  assert.match(css, /--house-fire: #a84b32;/);
  assert.match(css, /scrollbar-color: #2f9e62 transparent;/);
  assert.match(css, /\.notice-desk \{/);
  assert.match(css, /\.notice-alert \{/);
  assert.match(css, /\.notice-item\.is-ok,/);
  assert.doesNotMatch(css, /\.notice-item\.is-friend,[\s\S]*?#8b5cff/);
  assert.doesNotMatch(css, /\.notice-item\.is-deposit,[\s\S]*?#7af0ff/);
  assert.match(css, /\.wait-well \{[\s\S]*?aspect-ratio: var\(--cols\) \/ var\(--rows\);/);
  assert.match(css, /\.wait-play \{[\s\S]*?container-type: inline-size;/);
  assert.match(css, /50cqi/);
  assert.doesNotMatch(css, /\.wait-well \{[\s\S]*?26vw/);
  assert.match(css, /\.wait-desk \{\n  display: grid;\n  grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(css, /\.pit-app\.is-hall-lightning \{\n  --hall: #ffb020;/);
  assert.match(css, /--hue-amber: #ffb020;/);
  assert.doesNotMatch(css, /scrollbar-color: #ffb020/);
  assert.match(themeSrc, /HOUSE_LIGHT_FIRE/);
});

test("a live table fills the floor, not a sliver under house chrome", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(css, /body:has\(\.pit-app\) header/);
  assert.match(css, /body:has\(\.pit-app\) footer/);
  assert.match(css, /body:has\(\.pit-app\) \.house-stage-pad/);
  assert.match(css, /\.pit-app \{[\s\S]*?min-height: 100dvh;/);
  assert.match(css, /\.pit-app \{[\s\S]*?background: #070614;/);
});

test("news stays a house path, not an outlet redirect", () => {
  const id = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  assert.equal(newsHref(id), `/news/${id}`);
});

test("the news desk keeps ten chips, not every outlet", () => {
  const rows = Array.from({ length: 40 }, (_, i) => ({ source: `Desk ${i}`, count: 40 - i }));
  assert.equal(newsDeskChips(rows).length, 10);
  assert.equal(newsDeskChips(rows)[0]?.source, "Desk 0");
  const picked = newsDeskChips(rows, (row) => row.source === "Desk 30");
  assert.equal(picked.length, 10);
  assert.equal(picked[0]?.source, "Desk 30");
});

test("news cards keep a real gap between title, copy, and the next story", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const desk = readFileSync(new URL("../src/components/NewsDesk.tsx", import.meta.url), "utf8");
  assert.match(css, /\.news-list \{\n  display: grid;\n  gap: 1\.6rem;/);
  assert.match(css, /\.news-card-body \{[\s\S]*?gap: 0\.85rem;/);
  assert.match(desk, /gap: 2/);
});

test("the footer is a desk with columns and a language pick, not a wrap of links", () => {
  const foot = readFileSync(new URL("../src/components/SiteFooter.tsx", import.meta.url), "utf8");
  assert.match(foot, /LanguagePick/);
  assert.match(foot, /gridTemplateColumns/);
  assert.match(foot, /copy\.line\.house/);
  assert.match(foot, /copy\.line\.play/);
  assert.match(foot, /FootCol/);
  assert.doesNotMatch(foot, /NAV\.network/);
});

test("the floor hides the left rail on a phone and keeps page titles human", () => {
  const floor = readFileSync(new URL("../src/components/HouseFloor.tsx", import.meta.url), "utf8");
  const news = readFileSync(new URL("../src/components/NewsDesk.tsx", import.meta.url), "utf8");
  const wait = readFileSync(new URL("../src/app/wait/page.tsx", import.meta.url), "utf8");
  assert.match(floor, /display: \{ xs: "none", md: "block" \}/);
  assert.match(news, /Betting news/);
  assert.match(wait, /Sit a book/);
  assert.match(wait, /Down keeps the stack low/);
  assert.match(wait, /Burst holds a column/);
});
