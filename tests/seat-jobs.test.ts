import assert from "node:assert/strict";
import test from "node:test";
import { companyFaces, othersOnBook, seatJobs } from "@/lib/seat-jobs";

test("each job is a door, and the book still holds no wallet", () => {
  const people = companyFaces(
    ["ada", "house", "gone", "ada"],
    [
      { id: "ada", username: "ada" },
      { id: "house", username: "house" },
      { id: "gone", username: "gone", closed: true },
    ],
  );
  assert.deepEqual(people, [{ username: "ada", href: "/network/u/ada" }]);
  const same = othersOnBook(
    [
      { id: "house", username: "house", book: "wait-down" },
      { id: "ada", username: "ada", book: "wait-down" },
      { id: "bill", username: "bill", book: "wait-down" },
    ],
    "wait-down",
    "bill",
  );
  const jobs = seatJobs({
    people,
    circles: [{ id: "seat-game", label: "Game" }],
    book: { id: "wait-down", name: "Down", watch: "Watch 2" },
    sameBook: same,
    lines: [
      { title: "Classic", href: "/rooms/classic" },
      { title: "Games", href: "/wait" },
    ],
    files: [{ title: "Down", href: "/wait?sit=wait-down" }],
    vault: false,
  });
  assert.equal(jobs.social.people.length, 1);
  assert.equal(jobs.social.circles[0]?.href, "/rooms/c/seat-game");
  assert.equal(jobs.ai.watch, "Watch 2");
  assert.equal(jobs.ai.sitHref, "/wait?sit=wait-down");
  assert.deepEqual(
    jobs.ai.lines.map((row) => row.href),
    ["/rooms/classic", "/wait"],
  );
  assert.equal(jobs.ai.speaksAsSeat, false);
  assert.equal(jobs.ai.holdsWallet, false);
  assert.equal(jobs.web3.files[0]?.href, "/wait?sit=wait-down");
  assert.equal(jobs.web3.vaultHref, "");
  assert.equal(jobs.web3.secondNumber, false);
  const yours = seatJobs({
    people: [],
    circles: [],
    book: null,
    sameBook: same,
    lines: [],
    files: [],
    vault: true,
  });
  assert.equal(yours.ai.bookName, "");
  assert.equal(yours.ai.sitHref, "/wait");
  assert.equal(yours.ai.pairHref, "");
  assert.equal(yours.ai.sameBook.length, 0);
  assert.equal(yours.ai.lines.length, 0);
  const capped = seatJobs({
    people: [],
    circles: [],
    book: null,
    sameBook: [],
    lines: [
      { title: "One", href: "/rooms/classic" },
      { title: "Two", href: "/wait" },
      { title: "Three", href: "/jobs" },
      { title: "Four", href: "/fairness" },
      { title: "", href: "/network" },
    ],
    files: [],
    vault: false,
  });
  assert.deepEqual(
    capped.ai.lines.map((row) => row.title),
    ["One", "Two", "Three"],
  );
  assert.equal(yours.web3.vaultHref, "/account");
  assert.equal(yours.web3.files.length, 0);
  assert.equal(JSON.stringify(yours).includes("reputation"), false);
});
