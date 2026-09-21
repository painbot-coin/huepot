/**
 * Standing HUE can be claimed once.
 *
 * The queue is a later file. These tests pin the arithmetic a double-send
 * would get wrong: unpaid standing, a partial send, and a rejected row that
 * must not keep the coin locked.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  HUE_TESTNET_CHAIN_ID,
  HUE_UNITS,
  claimableHue,
  countsTowardSent,
  floorHue,
  hueChainId,
  hueConfigured,
  hueExplorerTx,
  hueToBaseUnits,
  isHueAddress,
  sentHue,
} from "@/lib/hue-claim";

test("zero play claims nothing", () => {
  assert.equal(claimableHue(0, []), 0);
  assert.equal(claimableHue(0.9, []), 0);
  assert.equal(hueToBaseUnits(0), 0n);
});

test("unpaid standing is the whole floor", () => {
  assert.equal(floorHue(46.8), 46);
  assert.equal(claimableHue(46.8, []), 46);
  assert.equal(hueToBaseUnits(46), 46n * HUE_UNITS);
});

test("a paid or queued send cannot be claimed again", () => {
  const claims = [
    { amount: 20, status: "paid" },
    { amount: 10, status: "queued" },
  ];
  assert.equal(sentHue(claims), 30);
  assert.equal(claimableHue(46, claims), 16);
  assert.equal(claimableHue(30, claims), 0);
});

test("a partial send leaves the rest", () => {
  assert.equal(claimableHue(50, [{ amount: 10, status: "paid" }]), 40);
});

test("a rejected row does not lock the coin", () => {
  assert.equal(countsTowardSent("rejected"), false);
  assert.equal(claimableHue(20, [{ amount: 20, status: "rejected" }]), 20);
});

test("a sending row is already spoken for", () => {
  assert.equal(claimableHue(15, [{ amount: 15, status: "sending" }]), 0);
});

test("only a 20-byte hex address is a destination", () => {
  assert.equal(isHueAddress("0x1111111111111111111111111111111111111111"), true);
  assert.equal(isHueAddress("1111111111111111111111111111111111111111"), false);
  assert.equal(isHueAddress("0x123"), false);
});

test("the explorer is testnet, not mainnet", () => {
  const href = hueExplorerTx("0x" + "ab".repeat(32));
  assert.equal(href.startsWith("https://testnet.bscscan.com/tx/"), true);
});

test("mainnet chain id turns the rail off", () => {
  const chain = process.env.HUE_CHAIN_ID;
  const token = process.env.HUE_TOKEN;
  const key = process.env.HUE_HOT_KEY;
  process.env.HUE_TOKEN = "0x1111111111111111111111111111111111111111";
  process.env.HUE_HOT_KEY = "0x" + "11".repeat(32);
  process.env.HUE_CHAIN_ID = "56";
  assert.equal(hueChainId(), 56);
  assert.equal(hueConfigured(), false);
  process.env.HUE_CHAIN_ID = String(HUE_TESTNET_CHAIN_ID);
  assert.equal(hueConfigured(), true);
  if (chain == null) delete process.env.HUE_CHAIN_ID;
  else process.env.HUE_CHAIN_ID = chain;
  if (token == null) delete process.env.HUE_TOKEN;
  else process.env.HUE_TOKEN = token;
  if (key == null) delete process.env.HUE_HOT_KEY;
  else process.env.HUE_HOT_KEY = key;
});
