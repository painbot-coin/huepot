/** Receipts can credit a send when public getLogs cannot read old blocks. */

export const USDT_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export function isBscTxHash(value: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(value.trim());
}

export type ReceiptLog = {
  address?: string;
  topics?: readonly string[];
  data?: string;
  transactionHash?: string;
  index?: number;
  logIndex?: number;
  blockNumber?: number;
};

export type ClaimedTransfer = {
  to: string;
  data: string;
  txHash: string;
  logIndex: number;
  blockNumber: number;
};

export function usdtTransfersTo(
  logs: readonly ReceiptLog[],
  contract: string,
  toAddress: string,
  txHash = "",
) {
  const token = contract.toLowerCase();
  const dest = toAddress.toLowerCase();
  const hash = txHash.toLowerCase();
  const hits: ClaimedTransfer[] = [];
  for (const log of logs) {
    if ((log.address || "").toLowerCase() !== token) continue;
    const topics = log.topics ?? [];
    if ((topics[0] || "").toLowerCase() !== USDT_TRANSFER_TOPIC) continue;
    const to = topics[2] ? `0x${topics[2].slice(26)}`.toLowerCase() : "";
    if (to !== dest) continue;
    hits.push({
      to,
      data: log.data || "0x",
      txHash: (log.transactionHash || hash).toLowerCase(),
      logIndex: log.index ?? log.logIndex ?? 0,
      blockNumber: log.blockNumber ?? 0,
    });
  }
  return hits;
}
