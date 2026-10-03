import test from "node:test";
import assert from "node:assert/strict";
import {
  HOUSE_MARKS,
  canDownloadWeights,
  canPlayMark,
  canWatchMark,
  deskHref,
  deskKind,
  deskPair,
  deskShowsWallet,
  deskSitNeed,
  deskSitShort,
  deskVaultHref,
  deskWalletHref,
  deskWalletLine,
  sitFromNext,
  storeShortMark,
  storeVaultHref,
  freePricedLine,
  publicOwnedBooks,
  vaultKeepsWatch,
  vaultReturnLine,
  vaultSitLine,
  watchVaultHref,
  watchVaultLine,
  sitParam,
  defaultEastId,
  defaultWestId,
  filterMarks,
  groupMarks,
  markById,
  priceLabel,
  publicMarks,
  weightsFor,
} from "@/lib/house-mark-list";
import { markBuyNote, paidMarkInStore } from "@/lib/mark-note";
import { CATCH_DEEP_WEIGHTS, CATCH_FIRST_WEIGHTS } from "@/lib/catch-weights";
import { cashImpliedCents } from "@/lib/sit-chips";
import { BREAK_FIRST_WEIGHTS } from "@/lib/break-weights";
import { LANE_FIRST_WEIGHTS } from "@/lib/lane-weights";
import { SNAKE_FIRST_WEIGHTS } from "@/lib/snake-weights";
import { seedBook } from "@/lib/tetris-stack";
import { STYLE_STACK_WEIGHTS } from "@/lib/tetris-style-weights";

test("the shelf lists game books, not color-pot books", () => {
  const rows = publicMarks([], { "wait-live": seedBook() });
  assert.ok(rows.some((row) => row.id === "wait-live" && row.priceCents === 0 && row.owned));
  assert.ok(rows.some((row) => row.id === "wait-down" && row.playerType === "Fast line reducer"));
  assert.ok(rows.some((row) => row.id === "wait-burst" && row.playerType === "Huge sender"));
  assert.ok(rows.some((row) => row.id === "catch-live" && row.status === "live"));
  assert.ok(rows.some((row) => row.id === "snake-deep" && row.priceCents === 250 && !row.owned));
  assert.ok(rows.some((row) => row.id === "aim-live" && row.status === "live"));
  assert.ok(rows.some((row) => row.id === "lane-live" && row.status === "live"));
  assert.ok(rows.some((row) => row.id === "break-live" && row.status === "live"));
  assert.ok(!rows.some((row) => row.id === "aim-1"));
  assert.ok(!rows.some((row) => row.id === "lane-1"));
  assert.ok(!rows.some((row) => row.id === "break-1"));
  assert.ok(!rows.some((row) => row.id.startsWith("classic-")));
});

test("anyone may pick a live game book; gold is only to take it home", () => {
  const snaps = { "wait-live": seedBook() };
  const down = markById("wait-down")!;
  const burst = markById("wait-burst")!;
  const catchDeep = markById("catch-deep")!;
  assert.equal(canPlayMark(down), true);
  assert.equal(canPlayMark(burst), true);
  assert.equal(canPlayMark(markById("catch-first")!), true);
  assert.equal(canWatchMark(catchDeep), true);
  assert.equal(canWatchMark(down), true);
  assert.equal(canDownloadWeights(down, []), true);
  assert.equal(canDownloadWeights(burst, []), false);
  assert.equal(canDownloadWeights(catchDeep, []), false);
  assert.equal(canDownloadWeights(catchDeep, ["catch-deep"]), true);
  assert.deepEqual(weightsFor("wait-down", snaps), STYLE_STACK_WEIGHTS.down);
  assert.deepEqual(weightsFor("wait-burst", snaps), STYLE_STACK_WEIGHTS.burst);
  assert.equal(down.playerType, "Fast line reducer");
  assert.equal(burst.playerType, "Huge sender");
  assert.deepEqual(weightsFor("catch-first", snaps), CATCH_FIRST_WEIGHTS);
  assert.deepEqual(weightsFor("catch-deep", snaps), CATCH_DEEP_WEIGHTS);
  assert.deepEqual(weightsFor("snake-first", snaps), SNAKE_FIRST_WEIGHTS);
  assert.deepEqual(weightsFor("lane-first", snaps), LANE_FIRST_WEIGHTS);
  assert.deepEqual(weightsFor("break-first", snaps), BREAK_FIRST_WEIGHTS);
});

test("the vault tag keeps only priced marks", () => {
  const rows = filterMarks(publicMarks([], {}), "vault");
  assert.ok(rows.length >= 2);
  assert.ok(rows.every((row) => row.priceCents > 0));
});

test("games group stack, catch, snake, aim, lane, and break", () => {
  const groups = groupMarks(publicMarks([], {}));
  assert.deepEqual(
    groups.map((row) => row.id),
    ["wait", "catch", "snake", "aim", "lane", "break"],
  );
});

test("the wait games are all live", () => {
  assert.equal(
    HOUSE_MARKS.some((row) => row.status === "coming"),
    false,
  );
  assert.equal(canPlayMark(markById("break-live")!), true);
  assert.equal(canPlayMark(markById("lane-live")!), true);
});

test("a mark debit is gold leaving the vault", () => {
  assert.equal(cashImpliedCents([{ type: "mark", amount: 200 }]), -200);
});

test("a free mark is labelled free", () => {
  assert.equal(priceLabel(0), "Free");
  assert.equal(priceLabel(800), "8.00 USDT");
});

test("west and east default to different books", () => {
  assert.notEqual(defaultWestId("wait"), defaultEastId("wait"));
  assert.notEqual(defaultWestId("catch"), defaultEastId("catch"));
  assert.notEqual(defaultWestId("snake"), defaultEastId("snake"));
  assert.notEqual(defaultWestId("aim"), defaultEastId("aim"));
  assert.notEqual(defaultWestId("lane"), defaultEastId("lane"));
  assert.notEqual(defaultWestId("break"), defaultEastId("break"));
});

test("the store can open the wait desk on the book you watched", () => {
  assert.equal(sitParam("catch-first"), "catch-first");
  assert.equal(sitParam("wait-burst"), "wait-burst");
  assert.equal(sitParam("../evil"), "");
  assert.equal(sitParam("classic-1"), "");
  assert.equal(deskHref("catch-deep"), "/wait?sit=catch-deep");
  assert.equal(deskHref("nope"), "/wait");
  assert.equal(deskKind("catch-deep"), "catch");
  assert.deepEqual(deskPair("catch", "catch-deep"), { west: "catch-deep", east: "catch-first" });
  assert.deepEqual(deskPair("wait", "wait-burst"), { west: "wait-burst", east: "wait-down" });
  assert.deepEqual(deskPair("catch", ""), { west: "catch-first", east: "catch-deep" });
  assert.notEqual(deskPair("aim", "aim-deep").west, deskPair("aim", "aim-deep").east);
  assert.equal(canDownloadWeights(markById("catch-first")!, []), true);
  assert.equal(canDownloadWeights(markById("catch-deep")!, []), false);
});

test("the desk shows the wallet only when a priced sit is on the well", () => {
  assert.equal(deskShowsWallet(markById("catch-first")), false);
  assert.equal(deskShowsWallet(markById("catch-deep")), true);
  assert.equal(deskShowsWallet(markById("wait-burst")), true);
  assert.equal(deskShowsWallet(markById("wait-down")), false);
  assert.equal(deskShowsWallet(null), false);
  assert.equal(deskWalletLine(false, 0), "A priced sit needs an account.");
  assert.equal(deskWalletLine(true, 250), "Wallet 2.50 USDT");
});

test("the desk opens the wallet door when a priced sit is short", () => {
  const deep = markById("catch-deep");
  const sit = "/wait?sit=catch-deep";
  const dest = encodeURIComponent(sit);
  assert.equal(deskSitNeed(markById("catch-first")), 0);
  assert.equal(deskSitNeed({ ...deep!, owned: false }), 250);
  assert.equal(deskSitNeed({ ...deep!, owned: true }), 0);
  assert.equal(deskSitShort(0, 250), true);
  assert.equal(deskSitShort(250, 250), false);
  assert.equal(deskWalletLine(true, 0, 250), "Wallet 0.00 USDT · short");
  assert.equal(deskWalletHref(false, 0, 250, sit), `/signin?next=${dest}`);
  assert.equal(deskWalletHref(true, 0, 250, sit), "/invest?sit=catch-deep");
  assert.equal(deskWalletHref(true, 250, 250, sit), "");
  assert.equal(deskVaultHref(sit), "/invest?sit=catch-deep");
  assert.equal(sitFromNext(sit), "catch-deep");
  assert.equal(sitFromNext("/rooms/classic"), "");
  assert.equal(vaultSitLine({ ...deep!, owned: false }, 0), "Catch deep sit · short 2.50 USDT");
  assert.equal(vaultSitLine({ ...deep!, owned: false }, 250), "Catch deep sit · gold is enough");
  assert.equal(vaultSitLine({ ...deep!, owned: true }, 0), "Catch deep sit is on the desk.");
});

test("the store opens the same vault sit when a priced file is short", () => {
  const deep = markById("catch-deep")!;
  const vault = encodeURIComponent("/invest?sit=catch-deep");
  const rows = [{ ...deep, owned: false }, { ...markById("catch-first")!, owned: true }];
  assert.equal(storeVaultHref(false, 0, { ...deep, owned: false }), `/signin?next=${vault}`);
  assert.equal(storeVaultHref(true, 0, { ...deep, owned: false }), "/invest?sit=catch-deep");
  assert.equal(storeVaultHref(true, 250, { ...deep, owned: false }), "");
  assert.equal(storeVaultHref(true, 0, { ...deep, owned: true }), "");
  assert.equal(storeShortMark(rows, true, 0)?.id, "catch-deep");
  assert.equal(storeShortMark(rows, true, 250), null);
});

test("a watch on a priced book opens that vault sit when gold is short", () => {
  const deep = markById("catch-deep")!;
  const vault = encodeURIComponent("/invest?sit=catch-deep");
  assert.equal(watchVaultHref(false, 0, { ...deep, owned: false }), `/signin?next=${vault}`);
  assert.equal(watchVaultHref(true, 0, { ...deep, owned: false }), "/invest?sit=catch-deep");
  assert.equal(watchVaultHref(true, 250, { ...deep, owned: false }), "");
  assert.equal(watchVaultHref(true, 0, { ...deep, owned: true }), "");
  assert.equal(watchVaultHref(false, 0, markById("catch-first")!), "");
  assert.equal(watchVaultLine(false), "Sign in to buy");
  assert.equal(watchVaultLine(true), "Open wallet");
});

test("a short priced sit keeps its watch on the vault until gold is enough", () => {
  const deep = markById("catch-deep")!;
  assert.equal(vaultKeepsWatch({ ...deep, owned: false }, 0), true);
  assert.equal(vaultKeepsWatch({ ...deep, owned: false }, 250), false);
  assert.equal(vaultKeepsWatch({ ...deep, owned: true }, 0), false);
  assert.equal(vaultKeepsWatch(markById("catch-first"), 0), false);
});

test("owned books name the sit and leave the wallet off the list", () => {
  const books = publicOwnedBooks(["catch-deep", "missing", "snake-deep"]);
  assert.deepEqual(
    books.map((book) => book.id),
    ["catch-deep", "snake-deep"],
  );
  assert.equal(books[0]?.name.length > 0, true);
  assert.equal("balance" in (books[0] ?? {}), false);
});

test("free and priced stay one sentence apart, and gold returns to the sit", () => {
  assert.equal(freePricedLine(), "A free file downloads. A priced file needs gold.");
  assert.equal(vaultReturnLine(false), "This sit stays on the vault until gold is enough.");
  assert.match(vaultReturnLine(true), /same book/);
  assert.equal(deskHref("catch-deep"), "/wait?sit=catch-deep");
});

test("a paid mark is the vault row, not only the json shelf", () => {
  assert.equal(markBuyNote("catch-deep"), "Wait mark · catch-deep");
  const store = {
    txs: [
      { id: "1", playerId: "u1", type: "mark" as const, amount: 250, createdAt: 1, note: markBuyNote("catch-deep") },
    ],
  };
  assert.equal(paidMarkInStore(store, "u1", "catch-deep"), true);
  assert.equal(paidMarkInStore(store, "u1", "catch-first"), false);
  assert.equal(paidMarkInStore(store, "u2", "catch-deep"), false);
});
