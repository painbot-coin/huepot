import test from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "@/lib/next-path";

test("Talk and the wing are paths the gate may return to", () => {
  assert.equal(safeNext("/network?post=wire-abc"), "/network?post=wire-abc");
  assert.equal(safeNext("/network"), "/network");
  assert.equal(safeNext("/news"), "/news");
  assert.equal(safeNext(`/news/${"a".repeat(32)}`), `/news/${"a".repeat(32)}`);
  assert.equal(safeNext("/wait"), "/wait");
  assert.equal(safeNext("/wait?sit=catch-first"), "/wait?sit=catch-first");
  assert.equal(safeNext("/wait/store"), "/wait/store");
  assert.equal(safeNext("/jobs"), "/jobs");
  assert.equal(safeNext("/jobs/lane"), "/jobs/lane");
  assert.equal(safeNext("/jobs/you"), "/jobs/you");
  assert.equal(safeNext("/manage"), "/manage");
  assert.equal(safeNext("/manage?app=abc"), "/manage?app=abc");
  assert.equal(safeNext("/manage?report=abc"), "/manage?report=abc");
  assert.equal(safeNext("/seat"), "/seat");
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
