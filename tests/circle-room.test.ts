import assert from "node:assert/strict";
import test from "node:test";
import { circleOf, circlesOf, holdsPot, joinOn, leaveOn, listedCircles } from "@/lib/circle-room";

test("a circle is a craft or a language, and it does not hold the pot", () => {
  assert.equal(holdsPot(), false);
  assert.equal(circleOf("classic"), null);
  assert.equal(circleOf("night"), null);
  assert.equal(circleOf("fog"), null);
  assert.equal(circleOf("seat-game")?.kind, "craft");
  assert.equal(circleOf("lang-es")?.label, "Español");
  assert.equal(circleOf("lang-nope"), null);
});

test("an empty room is not listed, and the house is not a person in it", () => {
  assert.equal(listedCircles([{ id: "seat-ai", members: [] }]).length, 0);
  assert.equal(listedCircles([{ id: "lang-ja", members: ["house"] }]).length, 0);
  const open = listedCircles([
    { id: "seat-game", members: ["ada", "house"] },
    { id: "classic", members: ["ada"] },
  ]);
  assert.deepEqual(
    open.map((row) => row.id),
    ["seat-game"],
  );
  assert.deepEqual(open[0]?.members, ["ada"]);
  assert.deepEqual(circlesOf([{ id: "seat-game", members: ["ada", "house"] }], "ada"), [
    { id: "seat-game", label: "Game" },
  ]);
  assert.equal(circlesOf([{ id: "seat-game", members: ["ada"] }], "house").length, 0);
  assert.equal(circlesOf([{ id: "seat-game", members: ["ada"] }], "bea").length, 0);
});

test("the last seat to leave takes the room off the list", () => {
  const joined = joinOn([], "lang-fr", "ada");
  assert.equal(listedCircles(joined.rows).length, 1);
  const left = leaveOn(joined.rows, "lang-fr", "ada");
  assert.equal(listedCircles(left.rows).length, 0);
  assert.throws(() => joinOn([], "classic", "ada"), /craft or a language/);
});
