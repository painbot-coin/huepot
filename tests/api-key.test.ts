import assert from "node:assert/strict";
import test from "node:test";
import { hashKey, holdKey, issueKey, keyMatches, peekKey, sealStored, seatForKey } from "@/lib/atrium/key";

test("a bearer matches the hash, and the old plaintext still matches until it is sealed", () => {
  const issued = issueKey();
  assert.equal(issued.stored.startsWith("sha256:"), true);
  assert.equal(keyMatches(issued.stored, issued.plain), true);
  assert.equal(keyMatches(issued.stored, "nope"), false);
  assert.equal(keyMatches(issued.plain, issued.plain), true);
  const sealed = sealStored(issued.plain);
  assert.equal(sealed, hashKey(issued.plain));
  assert.equal(keyMatches(sealed, issued.plain), true);
  assert.equal(sealStored(sealed), sealed);
  assert.equal(keyMatches("", issued.plain), false);
});

test("the page shows a new key once, and a scan does not stop at the first seat", () => {
  const first = issueKey();
  const second = issueKey();
  holdKey("ada", first.plain);
  assert.equal(peekKey("ada", Date.now()), first.plain);
  assert.equal(peekKey("ada", Date.now() + 61_000), "");
  const found = seatForKey(
    [
      { id: "ada", apiKey: first.stored },
      { id: "bea", apiKey: second.stored },
    ],
    second.plain,
  );
  assert.equal(found?.id, "bea");
  assert.equal(seatForKey([{ id: "ada", apiKey: first.stored }], "missing"), null);
});
