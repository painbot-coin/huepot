import assert from "node:assert/strict";
import test from "node:test";
import { seatBookFace } from "@/lib/seat-book";

test("a seat's book shows the watch and the file, and gold returns to that sit", () => {
  const down = seatBookFace("wait-down", { watchScore: 3, watchNote: "low", viewerIsSeat: true });
  assert.equal(down?.file, "Free file");
  assert.equal(down?.goldHref, "");
  assert.match(down?.watch ?? "", /Watch 3/);
  assert.equal(down?.sitHref, "/wait?sit=wait-down");
  assert.equal(JSON.stringify(down).includes("balance"), false);

  const burst = seatBookFace("wait-burst", { owned: false, watchScore: 4, viewerIsSeat: true });
  assert.equal(burst?.goldHref, "/invest?sit=wait-burst");
  assert.match(burst?.file ?? "", /gold returns to this sit/);
  assert.equal(
    seatBookFace("wait-burst", { owned: false, watchScore: 4, viewerIsSeat: false })?.goldHref,
    "",
  );
  assert.equal(seatBookFace("wait-burst", { owned: true, viewerIsSeat: true })?.file, "The file is on this seat.");
  assert.equal(seatBookFace("wait-burst", { owned: true, viewerIsSeat: true })?.goldHref, "");
  assert.equal(seatBookFace("classic", { viewerIsSeat: true }), null);
  assert.equal(seatBookFace("", {}), null);
  assert.equal(seatBookFace("wait-down", { watchScore: null })?.watch, "No watch yet.");
});
