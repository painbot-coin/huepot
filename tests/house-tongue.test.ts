import test from "node:test";
import assert from "node:assert/strict";
import { LOCALES } from "@/lib/locale";
import { hallDoors } from "@/lib/hall-doors";
import {
  potLine,
  spokenDay,
  spokenDoors,
  spokenSeat,
  storeSentence,
} from "@/lib/house-tongue";

test("the hall, the seat, the store, and a daily line follow the language", () => {
  const doors = spokenDoors("es");
  assert.deepEqual(
    doors.map((door) => door.href),
    hallDoors().map((door) => door.href),
  );
  assert.notEqual(doors[0]?.title, "Sit a color");
  assert.match(doors[0]?.line ?? "", /Classic/);
  assert.equal(spokenSeat("es", "here").label, "Aquí");
  assert.match(storeSentence("es"), /oro/);
  assert.match(storeSentence("zh"), /金子/);
  const letter = spokenDay("es", "Letters");
  assert.equal(letter?.title, "Cartas");
  assert.match(letter?.body ?? "", /carta/);
  assert.equal(spokenDay("en", "Letters")?.body, "A letter stays a letter.");
  assert.equal(spokenDay("fr", "Not a house line"), null);
});

test("every language keeps the pot on Classic", () => {
  for (const row of LOCALES) {
    assert.match(potLine(row.id), /Classic/, row.id);
    assert.match(spokenDay(row.id, "Classic")?.body ?? "", /Classic/, row.id);
    assert.equal(spokenDoors(row.id).length, 4, row.id);
    assert.equal(storeSentence(row.id).length > 10, true, row.id);
  }
});
