/**
 * A receipt can credit a send the log cursor skipped.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  USDT_TRANSFER_TOPIC,
  isBscTxHash,
  usdtTransfersTo,
} from "@/lib/deposit-claim";

const USDT = "0x55d398326f99059fF775485246999027B3197955";
const WALLET = "0x1111111111111111111111111111111111111111";
const HASH = "0x" + "ab".repeat(32);

function pad(address: string) {
  return "0x" + address.replace(/^0x/, "").toLowerCase().padStart(64, "0");
}

test("only a 32-byte hex hash is a BscScan hash", () => {
  assert.equal(isBscTxHash(HASH), true);
  assert.equal(isBscTxHash("  " + HASH + "  "), true);
  assert.equal(isBscTxHash("0xabc"), false);
  assert.equal(isBscTxHash("not-a-hash"), false);
});

test("a USDT transfer to the seat is kept; another address is not", () => {
  const hits = usdtTransfersTo(
    [
      {
        address: USDT,
        topics: [USDT_TRANSFER_TOPIC, pad("0x2222222222222222222222222222222222222222"), pad(WALLET)],
        data: "0x" + (10n ** 18n).toString(16).padStart(64, "0"),
        transactionHash: HASH,
        index: 3,
        blockNumber: 100,
      },
      {
        address: USDT,
        topics: [USDT_TRANSFER_TOPIC, pad(WALLET), pad("0x3333333333333333333333333333333333333333")],
        data: "0x" + (10n ** 18n).toString(16).padStart(64, "0"),
        transactionHash: HASH,
        index: 4,
        blockNumber: 100,
      },
    ],
    USDT,
    WALLET,
    HASH,
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.to, WALLET);
  assert.equal(hits[0]?.logIndex, 3);
});
