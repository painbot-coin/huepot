import test from "node:test";
import assert from "node:assert/strict";
import {
  HOUSE_SEAT_IDS,
  parseHouseSeat,
  seatHeadline,
  seatLabel,
  seatOf,
  seatTag,
} from "@/lib/house-seats";

test("the house keeps four crafts and a plain seat", () => {
  assert.deepEqual([...HOUSE_SEAT_IDS], ["game", "ai", "gamer", "better", "here"]);
  assert.equal(seatLabel("game"), "Game developer");
  assert.equal(seatLabel("ai"), "AI developer");
  assert.equal(seatLabel("gamer"), "Gamer");
  assert.equal(seatLabel("better"), "Bettor");
  assert.equal(seatLabel("here"), "Here");
  assert.equal(seatTag("gamer"), "Play");
  assert.equal(seatTag("better"), "Table");
  assert.equal(seatTag("here"), "Here");
  assert.equal(parseHouseSeat("here"), "here");
});

test("an empty seat still reads as a Huepot player", () => {
  assert.equal(parseHouseSeat(""), "");
  assert.equal(seatOf("lobby"), "");
  assert.equal(seatHeadline(""), "Huepot player");
  assert.equal(seatHeadline("ai"), "AI developer");
  assert.throws(() => parseHouseSeat("host"));
});
