import assert from "node:assert/strict";
import test from "node:test";
import { findCompany, type CompanySeat } from "@/lib/company-find";

const seats: CompanySeat[] = [
  { id: "ada", seat: "game", locale: "es", books: ["wait-down"] },
  { id: "bao", seat: "ai", locale: "", books: ["catch-first"] },
  { id: "house", seat: "here", locale: "en", books: ["wait-down"], house: true },
];

test("company is real seats, and an empty match stays empty", () => {
  const all = findCompany(seats);
  assert.deepEqual(
    all.map((row) => row.id),
    ["ada", "bao"],
  );
  assert.equal(findCompany(seats, { craft: "gamer" }).length, 0);
  assert.deepEqual(
    findCompany(seats, { locale: "es" }).map((row) => row.id),
    ["ada"],
  );
  assert.equal(findCompany(seats, { locale: "ja" }).length, 0);
  assert.deepEqual(
    findCompany(seats, { book: "catch-first" }).map((row) => row.id),
    ["bao"],
  );
  assert.equal(findCompany(seats, { book: "wait-burst" }).length, 0);
  assert.equal(findCompany([], { craft: "game" }).length, 0);
});
