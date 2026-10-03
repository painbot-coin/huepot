import test from "node:test";
import assert from "node:assert/strict";
import {
  HOUSE_PROJECT_OWNER,
  HOUSE_PROJECT_SPECS,
  houseProjectDoor,
  houseProjectRow,
  missingHouseProjects,
  seedHouseProjects,
} from "@/lib/house-projects";

test("the house posted four real doors, one per seat", () => {
  assert.deepEqual(
    HOUSE_PROJECT_SPECS.map((row) => row.id),
    ["house-wait", "house-books", "house-play", "house-classic"],
  );
  assert.deepEqual(
    HOUSE_PROJECT_SPECS.map((row) => row.seat),
    ["game", "ai", "gamer", "better"],
  );
  for (const spec of HOUSE_PROJECT_SPECS) {
    assert.match(spec.path, /^\//);
    const row = houseProjectRow(spec, 1);
    assert.equal(row.userId, HOUSE_PROJECT_OWNER);
    assert.equal(row.priceCents, 0);
    assert.match(row.href, /^https:\/\//);
  }
});

test("house doors stay on this house and stay off overlays", () => {
  const text = HOUSE_PROJECT_SPECS.flatMap((row) => [row.name, row.how, row.path]).join(" ");
  assert.match(text, /Games lab/);
  assert.match(text, /Classic table/);
  assert.match(houseProjectDoor("/wait"), /\/wait$/);
  assert.doesNotMatch(text, /overlay/i);
  assert.doesNotMatch(text, /HUE\/USDT pool/i);
  assert.doesNotMatch(text, /365 MB/);
});

test("a missing house door is seeded once", () => {
  const empty = seedHouseProjects([]);
  assert.equal(empty.length, 4);
  assert.equal(missingHouseProjects(empty).length, 0);
  assert.equal(seedHouseProjects(empty).length, 4);

  const partial = seedHouseProjects(empty.filter((row) => row.id !== "house-classic"));
  assert.equal(partial.some((row) => row.id === "house-classic"), true);
  assert.equal(partial.length, 4);
});

test("an old house door name is refreshed in place", () => {
  const stale = seedHouseProjects([]).map((row) =>
    row.id === "house-wait" ? { ...row, name: "Wait lab", how: "Six sits." } : row,
  );
  const next = seedHouseProjects(stale);
  const wait = next.find((row) => row.id === "house-wait");
  assert.equal(wait?.name, "Games lab");
  assert.match(wait?.how ?? "", /Play free/);
  assert.equal(next.length, 4);
});
