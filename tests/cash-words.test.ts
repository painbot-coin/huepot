import test from "node:test";
import assert from "node:assert/strict";
import { cashOutWord } from "@/lib/cash-words";

test("a cash-out reads waiting, sending, sent, or returned", () => {
  assert.equal(cashOutWord("queued"), "Waiting");
  assert.equal(cashOutWord("sending"), "Sending");
  assert.equal(cashOutWord("paid"), "Sent");
  assert.equal(cashOutWord("rejected"), "Returned");
});
