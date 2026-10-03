import test from "node:test";
import assert from "node:assert/strict";
import { hallDoors } from "@/lib/hall-doors";

test("the hall names four doors and Classic keeps the pot", () => {
  const doors = hallDoors();
  assert.deepEqual(
    doors.map((door) => door.title),
    ["Sit a color", "Sit a book", "Meet a seat", "Read the house"],
  );
  assert.equal(doors[0]?.href, "/rooms/classic");
  assert.equal(doors[1]?.href, "/wait");
  assert.equal(doors[2]?.href, "/network");
  assert.equal(doors[3]?.href, "/how-it-works");
  assert.match(doors[0]?.line ?? "", /pot/);
});
