import assert from "node:assert/strict";
import test from "node:test";
import { bookLabel, booksOnOneSit, pairLine, pairRecord } from "@/lib/book-pair";

test("a person's book sits against the house book, and neither holds a wallet", () => {
  const down = booksOnOneSit("wait-down");
  assert.equal(down?.person, "wait-down");
  assert.equal(down?.house, "wait-burst");
  assert.equal(down?.holdsWallet, false);
  assert.notEqual(down?.person, down?.house);

  const burst = booksOnOneSit("wait-burst");
  assert.equal(burst?.person, "wait-burst");
  assert.equal(burst?.house, "wait-down");
  assert.equal(booksOnOneSit("classic"), null);
  assert.equal(booksOnOneSit(""), null);

  const record = pairRecord(4, 2);
  assert.equal(record?.lead, "person");
  assert.equal(record?.wallet, false);
  assert.equal(pairLine("house"), "The house book leads the watch.");
  assert.equal(pairLine("even"), "The watch is even.");
  assert.equal(JSON.stringify(record).includes("balance"), false);
  assert.equal(bookLabel("wait-down"), "Down");
  assert.equal(pairRecord(Number.NaN, 1), null);
});
