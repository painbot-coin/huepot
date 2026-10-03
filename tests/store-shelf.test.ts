import test from "node:test";
import assert from "node:assert/strict";
import type { PublicMark } from "@/lib/house-mark-list";
import type { PublicProject } from "@/lib/seat-project-public";
import {
  STORE_SHELVES,
  filterShelfMarks,
  filterShelfProjects,
  parseStoreShelf,
  shelfShowsMarks,
  shelfShowsProjects,
  shelfShowsWorld,
} from "@/lib/store-shelf";

function mark(id: string, priceCents: number, status: PublicMark["status"] = "live"): PublicMark {
  return {
    id,
    kind: "wait",
    desk: "stack",
    name: id,
    version: "1",
    tags: [],
    how: "A sit.",
    features: [],
    priceCents,
    status,
    owned: priceCents <= 0,
    priceLabel: priceCents <= 0 ? "Free" : "2.50 USDT",
  };
}

function project(id: string, seat: PublicProject["seat"], priceCents: number): PublicProject {
  return {
    id,
    userId: "u1",
    seat,
    name: id,
    how: "A door out.",
    href: priceCents <= 0 ? "https://example.com" : "",
    priceCents,
    createdAt: 1,
    username: "ana",
    owned: priceCents <= 0,
    priceLabel: priceCents <= 0 ? "Free door" : "2.50 USDT",
  };
}

test("the store names house sits, world books, and the four seats", () => {
  assert.deepEqual(
    STORE_SHELVES.map((row) => row.id),
    ["all", "house", "world", "game", "ai", "gamer", "better", "here", "free", "vault"],
  );
  assert.equal(parseStoreShelf("Game"), "game");
  assert.equal(parseStoreShelf("nope"), "all");
  assert.equal(shelfShowsMarks("house"), true);
  assert.equal(shelfShowsWorld("world"), true);
  assert.equal(shelfShowsProjects("ai"), true);
  assert.equal(shelfShowsMarks("ai"), false);
  assert.equal(shelfShowsWorld("vault"), false);
});

test("a seat shelf keeps only that seat's projects", () => {
  const rows = [
    project("g1", "game", 0),
    project("a1", "ai", 250),
    project("b1", "better", 0),
  ];
  assert.deepEqual(
    filterShelfProjects(rows, "ai").map((row) => row.id),
    ["a1"],
  );
  assert.deepEqual(
    filterShelfProjects(rows, "free").map((row) => row.id),
    ["g1", "b1"],
  );
  assert.equal(filterShelfProjects(rows, "world").length, 0);
});

test("house and vault shelves keep live marks by price", () => {
  const rows = [mark("free-sit", 0), mark("vault-sit", 250), mark("soon", 0, "coming")];
  assert.deepEqual(
    filterShelfMarks(rows, "house").map((row) => row.id),
    ["free-sit", "vault-sit"],
  );
  assert.deepEqual(
    filterShelfMarks(rows, "vault").map((row) => row.id),
    ["vault-sit"],
  );
  assert.equal(filterShelfMarks(rows, "game").length, 0);
});
