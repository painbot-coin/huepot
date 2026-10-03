import assert from "node:assert/strict";
import { test } from "node:test";
import { floorYou } from "@/lib/house-you";

test("floorYou needs a username", () => {
  assert.equal(floorYou(null), null);
  assert.equal(floorYou({}), null);
  assert.deepEqual(floorYou({ username: "ana", seat: "better", headline: "sits the pot" }), {
    username: "ana",
    avatar: undefined,
    seat: "better",
    headline: "sits the pot",
    manager: false,
    reviewer: false,
  });
  assert.equal(floorYou({ username: "ana", manager: true })?.manager, true);
  assert.equal(floorYou({ username: "ana", reviewer: true })?.reviewer, true);
});
