/**
 * Company hears a sit. Once an hour, never the house, never a block.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  SIT_PULSE_MS,
  alreadyPulsed,
  companyNavLink,
  companySitLabel,
  companySitTargets,
  groupCompanySits,
  sitPulseBody,
  sitPulseTitle,
} from "@/lib/sit-pulse";
import type { Notice } from "@/lib/types";

test("the title names the table and the seat", () => {
  assert.equal(sitPulseTitle("Classic Pit", "danny"), "Classic Pit · @danny is sitting");
  assert.equal(sitPulseBody(), "Sit with them before the round ends.");
});

test("a block or the house never gets the pulse", () => {
  assert.deepEqual(
    companySitTargets("a", ["b", "house", "a", "c"], ["c"]),
    ["b"],
  );
});

test("the hall names company only when someone is sitting", () => {
  assert.deepEqual(groupCompanySits([]), []);
  assert.equal(companySitLabel("classic", "Classic Pit"), "Classic");
  const one = groupCompanySits([
    { username: "danny", slug: "classic", name: "Classic Pit" },
  ]);
  assert.equal(one.length, 1);
  assert.deepEqual(one[0].usernames, ["danny"]);
  const twoTables = groupCompanySits([
    { username: "bill", slug: "fog", name: "Fog Pit" },
    { username: "danny", slug: "classic", name: "Classic Pit" },
  ]);
  assert.equal(twoTables[0].slug, "classic");
  assert.equal(twoTables[1].slug, "fog");
});

test("the header names company only when someone is sitting", () => {
  assert.equal(companyNavLink([]), null);
  assert.deepEqual(
    companyNavLink([{ username: "danny", slug: "classic", name: "Classic Pit" }]),
    { href: "/rooms/classic", label: "@danny · Classic" },
  );
});

test("the same table is quiet for an hour", () => {
  const title = sitPulseTitle("Classic Pit", "danny");
  const notices: Notice[] = [
    {
      id: "1",
      userId: "friend",
      kind: "friend",
      title,
      body: sitPulseBody(),
      href: "/rooms/classic",
      read: false,
      createdAt: 1_000,
    },
  ];
  assert.equal(alreadyPulsed(notices, "friend", title, 1_000), true);
  assert.equal(alreadyPulsed(notices, "friend", title, 1_000 + SIT_PULSE_MS), false);
  assert.equal(alreadyPulsed(notices, "other", title, 1_000), false);
});
