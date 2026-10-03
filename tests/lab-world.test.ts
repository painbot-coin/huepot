import test from "node:test";
import assert from "node:assert/strict";
import { canDownloadWeights, canPlayMark, markById } from "@/lib/house-mark-list";
import { WORLD_BOOKS, isWorldBookId, worldBookIds } from "@/lib/lab-world";

test("world books never sit on the house shelf", () => {
  for (const id of worldBookIds()) {
    assert.equal(markById(id), null);
    assert.equal(isWorldBookId(id), true);
  }
});

test("a world book cannot be bought or played as a mark", () => {
  const world = WORLD_BOOKS[0]!;
  assert.equal(markById(world.id), null);
  assert.ok(!WORLD_BOOKS.some((row) => row.id === "break-live"));
  assert.equal(canPlayMark(markById("break-live")!), true);
  assert.equal(canDownloadWeights(markById("break-live")!, []), true);
});

test("world books keep official https doors and skip live overlays", () => {
  assert.ok(WORLD_BOOKS.some((row) => row.id === "chess-lc0" && row.weights === "public"));
  assert.ok(WORLD_BOOKS.some((row) => row.id === "go-kata" && row.weights === "public"));
  assert.ok(WORLD_BOOKS.every((row) => row.href.startsWith("https://")));
  assert.ok(!WORLD_BOOKS.some((row) => /counter-strike|valorant|apex|fortnite|pubg|roblox/i.test(row.game)));
});
