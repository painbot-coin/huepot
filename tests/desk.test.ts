import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { companyName, deskRole, helpNote, openingTitle } from "@/lib/desk";
import { hallFor } from "@/lib/hall";

test("a company name and a help note have to be real", () => {
  assert.equal(companyName("  "), "");
  assert.equal(companyName("  North Desk "), "North Desk");
  assert.equal(openingTitle("A"), "");
  assert.equal(openingTitle("Contract review"), "Contract review");
  assert.equal(helpNote("short"), "");
  assert.equal(helpNote("I can review the clause."), "I can review the clause.");
  assert.equal(deskRole("lawyer")?.label, "Lawyer");
  assert.equal(deskRole("hacker"), null);
});

test("wheel and dice are pot tables, not fixed-odds games", () => {
  const rooms = readFileSync(new URL("../src/lib/rooms.ts", import.meta.url), "utf8");
  assert.match(rooms, /slug: "wheel"[\s\S]*?buttonCount: 8/);
  assert.match(rooms, /slug: "dice"[\s\S]*?buttonCount: 6/);
  assert.match(rooms, /biggest pocket takes the pot/);
  assert.match(rooms, /biggest face takes the pot/);
  assert.doesNotMatch(rooms, /thirty-five to one|35 to 1/);
  assert.equal(hallFor("wheel")?.kicker, "Wheel");
  assert.equal(hallFor("dice")?.kicker, "Dice");
  assert.equal(hallFor("classic")?.kicker, "Public table");
});
