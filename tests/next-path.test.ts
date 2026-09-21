import test from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "@/lib/next-path";

test("Talk and the wing are paths the gate may return to", () => {
  assert.equal(safeNext("/network?post=wire-abc"), "/network?post=wire-abc");
  assert.equal(safeNext("/network"), "/network");
  assert.equal(safeNext("/news"), "/news");
  assert.equal(safeNext("/account"), "/account");
});

test("a crafted next cannot leave the house or loop the gate", () => {
  assert.equal(safeNext("https://evil.example/"), "");
  assert.equal(safeNext("//evil.example"), "");
  assert.equal(safeNext("/\\evil"), "");
  assert.equal(safeNext("/api/auth/google"), "");
  assert.equal(safeNext("/signin?next=/network"), "");
  assert.equal(safeNext(""), "");
  assert.equal(safeNext("/"), "");
});
