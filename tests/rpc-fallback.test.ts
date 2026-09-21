/**
 * A dead dedicated RPC must not freeze the watcher.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  PUBLIC_BSC_SEEDS,
  deadRpcNotice,
  isCatchingUp,
  isDeadDedicatedRpc,
  isRpcSlow,
  isSeedRefusal,
  pickWatchRpcUrl,
  publicCatchUpFrom,
  rateLimitNotice,
  skipArchiveNotice,
} from "@/lib/rpc-fallback";

test("a 401 dedicated URL is dead; a rate limit is not", () => {
  assert.equal(isDeadDedicatedRpc(new Error("server response 401 Unauthorized")), true);
  assert.equal(isDeadDedicatedRpc(new Error("limit exceeded")), false);
  assert.equal(deadRpcNotice().includes("public"), true);
});

test("an abandoned dedicated URL falls back to a public seed", () => {
  const dedicated = "https://rpc.example/secret";
  assert.equal(pickWatchRpcUrl(dedicated, false, 0), dedicated);
  assert.equal(pickWatchRpcUrl(dedicated, true, 0), PUBLIC_BSC_SEEDS[0]);
  assert.equal(pickWatchRpcUrl("", false, 1), PUBLIC_BSC_SEEDS[1]);
  assert.ok(PUBLIC_BSC_SEEDS.length >= 6);
});

test("a moving head with no log cursor is still catching up", () => {
  assert.equal(isCatchingUp(0, 0), false);
  assert.equal(isCatchingUp(1000, 0), true);
  assert.equal(isCatchingUp(1000, 900), false);
  assert.equal(isCatchingUp(1000, 100), true);
  assert.ok(rateLimitNotice().includes("lag"));
  assert.equal(isRpcSlow(new Error("eth_getLogs timed out")), true);
  assert.equal(isRpcSlow(new Error("server response 401 Unauthorized")), false);
});

test("a public archive 403 rotates; a stale cursor jumps to recent blocks", () => {
  assert.equal(isSeedRefusal(new Error("server response 403 Forbidden")), true);
  assert.equal(isSeedRefusal(new Error("Archive requests require a personal token")), true);
  assert.equal(publicCatchUpFrom(100, 10_000, 2_000), 8_000);
  assert.equal(publicCatchUpFrom(9_000, 10_000, 2_000), 9_001);
  assert.ok(skipArchiveNotice().includes("recent"));
});
