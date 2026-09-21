/**
 * A board row opens a sit, not a ranking of banks.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { boardPlaceFor, boardSitDoor } from "@/lib/board-sit";
import { COMPANY_CLASSIC_HREF, sitClassicLabel, sitWithThemLabel } from "@/lib/company-door";

test("place is the seat's mark, or nothing", () => {
  const seats = [
    { username: "bill", place: 1 },
    { username: "danny", place: 2 },
  ];
  assert.equal(boardPlaceFor(seats, "bill"), 1);
  assert.equal(boardPlaceFor(seats, "DANNY"), 2);
  assert.equal(boardPlaceFor(seats, "ghost"), null);
  assert.equal(boardPlaceFor(seats, ""), null);
});

test("a guest row still opens Classic", () => {
  const door = boardSitDoor({
    self: false,
    signedIn: false,
    relation: "none",
    sittingSlug: "",
  });
  assert.equal(door.sitHref, COMPANY_CLASSIC_HREF);
  assert.equal(door.sitLabel, sitClassicLabel());
  assert.equal(door.ask, false);
});

test("company already sitting opens that table", () => {
  const door = boardSitDoor({
    self: false,
    signedIn: true,
    relation: "friends",
    sittingSlug: "night",
  });
  assert.equal(door.sitHref, "/rooms/night");
  assert.equal(door.sitLabel, sitWithThemLabel());
  assert.equal(door.ask, false);
});

test("a stranger can be asked into company", () => {
  const door = boardSitDoor({
    self: false,
    signedIn: true,
    relation: "none",
    sittingSlug: "",
  });
  assert.equal(door.sitHref, COMPANY_CLASSIC_HREF);
  assert.equal(door.ask, true);
  assert.equal(door.sent, false);
});
