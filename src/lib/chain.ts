import {
  Contract,
  JsonRpcProvider,
  Wallet,
  formatUnits,
  id,
  zeroPadValue,
  type Log,
} from "ethers";
import {
  chainConfirms,
  chainRpcUrl,
  chainWatchEnabled,
  LIVE_CHAIN_ID,
  LIVE_USDT,
  LIVE_USDT_DECIMALS,
  withdrawKey,
  withdrawSendEnabled,
} from "@/lib/config";
import { prisma } from "@/lib/db";
import { fromCents, toCents } from "@/lib/money";
import { networkById } from "@/lib/networks";
import type { Withdrawal, WithdrawalStatus } from "@/lib/types";

const TRANSFER_TOPIC = id("Transfer(address,address,uint256)");
const SCAN_ID = LIVE_CHAIN_ID;
const LOOKBACK = 2_000;
const PUBLIC_SEEDS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
];

let started = false;
let scanning = false;
let lastError = "";
let lastScanAt = 0;
let lastBlock = 0;
let seedIndex = 0;
let provider: JsonRpcProvider | null = null;
let providerUrl = "";
let nextDelayMs = 20_000;

export async function ensureChainTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ChainScan (
      id TEXT PRIMARY KEY,
      lastBlock INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ChainDeposit (
      id TEXT PRIMARY KEY,
      txHash TEXT NOT NULL,
      logIndex INTEGER NOT NULL,
      userId TEXT NOT NULL,
      address TEXT NOT NULL,
      amount REAL NOT NULL,
      blockNumber INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      UNIQUE(txHash, logIndex)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Withdrawal (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      networkId TEXT NOT NULL,
      address TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      resolvedAt INTEGER,
      note TEXT NOT NULL DEFAULT '',
      txHash TEXT NOT NULL DEFAULT ''
    )
  `);
  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE Withdrawal ADD COLUMN txHash TEXT NOT NULL DEFAULT ''",
    );
  } catch {
    /* column already exists */
  }
}

function usesPublicSeed() {
  return !process.env.BSC_RPC_URL;
}

function chunkBlocks() {
  return usesPublicSeed() ? 80 : 800;
}

function addressChunk() {
  return usesPublicSeed() ? 1 : 20;
}

function isRpcLimit(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return (
    text.includes("limit exceeded") ||
    text.includes("-32005") ||
    text.includes("rate limit") ||
    text.includes("too many") ||
    text.includes("429")
  );
}

function shortScanError(error: unknown) {
  if (isRpcLimit(error)) {
    return "BNB public RPC rate-limited eth_getLogs. Scanning slower; set BSC_RPC_URL for a dedicated node.";
  }
  if (error instanceof Error) {
    const line = error.message.split("\n")[0] ?? "Scan failed";
    return line.length > 180 ? `${line.slice(0, 177)}…` : line;
  }
  return "Scan failed";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function activeRpcUrl() {
  if (process.env.BSC_RPC_URL) return process.env.BSC_RPC_URL;
  return PUBLIC_SEEDS[seedIndex % PUBLIC_SEEDS.length];
}

function rotateSeed() {
  if (!usesPublicSeed()) return;
  seedIndex += 1;
  provider = null;
}

function getProvider() {
  const url = activeRpcUrl();
  if (!provider || providerUrl !== url) {
    provider = new JsonRpcProvider(url, 56, { staticNetwork: true });
    providerUrl = url;
  }
  return provider;
}

async function getTransferLogs(
  from: number,
  to: number,
  addresses: string[],
  depth = 0,
): Promise<Log[]> {
  const topics = [
    TRANSFER_TOPIC,
    null,
    addresses.length === 1
      ? zeroPadValue(addresses[0], 32)
      : addresses.map((address) => zeroPadValue(address, 32)),
  ];
  try {
    return await getProvider().getLogs({
      address: LIVE_USDT,
      fromBlock: from,
      toBlock: to,
      topics,
    });
  } catch (error) {
    if (!isRpcLimit(error)) throw error;
    rotateSeed();
    if (to <= from || depth >= 3) throw error;
    const mid = from + Math.floor((to - from) / 2);
    await sleep(400);
    const left = await getTransferLogs(from, mid, addresses, depth + 1);
    await sleep(400);
    const right = await getTransferLogs(mid + 1, to, addresses, depth + 1);
    return [...left, ...right];
  }
}

export function startChainWatcher() {
  if (started || !chainWatchEnabled()) return;
  started = true;
  const tick = () => {
    void scanChain()
      .catch((error) => {
        lastError = shortScanError(error);
        nextDelayMs = isRpcLimit(error) ? 60_000 : 20_000;
      })
      .finally(() => {
        setTimeout(tick, nextDelayMs);
      });
  };
  setTimeout(tick, 2_000);
}

export function chainStatus() {
  const network = networkById(LIVE_CHAIN_ID);
  return {
    watching: chainWatchEnabled(),
    networkId: LIVE_CHAIN_ID,
    name: network.name,
    standard: network.standard,
    asset: network.asset,
    contract: LIVE_USDT,
    confirms: chainConfirms(),
    lastBlock,
    lastScanAt,
    lastError: lastError || null,
    explorer: "https://bscscan.com",
    canSend: withdrawSendEnabled(),
  };
}

export type HouseWalletStatus = {
  canSend: boolean;
  address: string;
  usdt: number;
  bnb: number;
  ready: boolean;
};

export function houseWalletAddress() {
  const key = withdrawKey();
  if (!key) return "";
  try {
    return new Wallet(key).address;
  } catch {
    return "";
  }
}

export async function houseWalletStatus(): Promise<HouseWalletStatus> {
  const address = houseWalletAddress();
  const empty: HouseWalletStatus = {
    canSend: withdrawSendEnabled(),
    address,
    usdt: 0,
    bnb: 0,
    ready: false,
  };
  if (!address || !chainRpcUrl()) return empty;
  try {
    const provider = new JsonRpcProvider(chainRpcUrl(), 56, { staticNetwork: true });
    const token = new Contract(LIVE_USDT, ["function balanceOf(address owner) view returns (uint256)"], provider);
    const [tokenBal, gasBal] = await Promise.all([
      token.balanceOf(address) as Promise<bigint>,
      provider.getBalance(address),
    ]);
    const usdt = Number(formatUnits(tokenBal, LIVE_USDT_DECIMALS));
    const bnb = Number(formatUnits(gasBal, 18));
    return {
      canSend: true,
      address,
      usdt,
      bnb,
      ready: tokenBal > BigInt(0) && gasBal > BigInt(0),
    };
  } catch {
    return empty;
  }
}

export async function scanChain() {
  if (scanning || !chainWatchEnabled()) return chainStatus();
  scanning = true;
  try {
    await ensureChainTables();
    const head = await getProvider().getBlockNumber();
    const confirms = chainConfirms();
    const safeHead = Math.max(0, head - confirms);
    lastBlock = head;

    const wallets = await prisma.wallet.findMany({
      where: { network: LIVE_CHAIN_ID },
      select: { userId: true, address: true },
    });
    const byAddress = new Map<string, string>();
    for (const wallet of wallets) {
      byAddress.set(wallet.address.toLowerCase(), wallet.userId);
    }

    const cursorRows = await prisma.$queryRawUnsafe<{ lastBlock: number }[]>(
      `SELECT lastBlock FROM ChainScan WHERE id = '${SCAN_ID}'`,
    ).catch(() => [] as { lastBlock: number }[]);
    const saved = cursorRows[0]?.lastBlock ?? 0;
    const from = saved > 0 ? saved + 1 : Math.max(0, safeHead - LOOKBACK);
    if (from > safeHead) {
      lastScanAt = Date.now();
      lastError = "";
      nextDelayMs = 20_000;
      return chainStatus();
    }

    const to = Math.min(from + chunkBlocks(), safeHead);
    if (byAddress.size) {
      const addresses = [...byAddress.keys()];
      const size = addressChunk();
      for (let i = 0; i < addresses.length; i += size) {
        const slice = addresses.slice(i, i + size);
        const logs = await getTransferLogs(from, to, slice);
        for (const log of logs) {
          const toTopic = log.topics[2];
          if (!toTopic) continue;
          const toAddress = `0x${toTopic.slice(26)}`.toLowerCase();
          const userId = byAddress.get(toAddress);
          if (!userId) continue;
          const amount = toCents(Number(formatUnits(log.data, LIVE_USDT_DECIMALS)));
          if (!Number.isFinite(amount) || amount < 1) continue;
          await creditLog({
            userId,
            address: toAddress,
            amount,
            txHash: log.transactionHash,
            logIndex: log.index,
            blockNumber: log.blockNumber,
          });
        }
      }
    }

    const now = Date.now();
    await prisma.$executeRawUnsafe(
      `INSERT INTO ChainScan (id, lastBlock, updatedAt) VALUES ('${SCAN_ID}', ${to}, ${now})
       ON CONFLICT(id) DO UPDATE SET lastBlock = ${to}, updatedAt = ${now}`,
    );
    lastScanAt = now;
    lastError = "";
    nextDelayMs = safeHead - to > chunkBlocks() * 4 ? 4_000 : 20_000;
    return chainStatus();
  } catch (error) {
    lastError = shortScanError(error);
    nextDelayMs = isRpcLimit(error) ? 60_000 : 20_000;
    throw error;
  } finally {
    scanning = false;
  }
}

async function depositAlreadyCredited(txHash: string) {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM Tx WHERE type = 'deposit' AND note LIKE ${`%${txHash}%`} LIMIT 1
  `;
  return rows.length > 0;
}

async function creditLog(input: {
  userId: string;
  address: string;
  amount: number;
  txHash: string;
  logIndex: number;
  blockNumber: number;
}) {
  const idValue = crypto.randomUUID();
  const txHash = input.txHash.toLowerCase();
  let inserted = false;
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO ChainDeposit (id, txHash, logIndex, userId, address, amount, blockNumber, createdAt)
       VALUES ('${idValue}', '${esc(txHash)}', ${input.logIndex}, '${esc(input.userId)}', '${esc(input.address)}', ${input.amount}, ${input.blockNumber}, ${Date.now()})`,
    );
    inserted = true;
  } catch {
    inserted = false;
  }

  if (!inserted && (await depositAlreadyCredited(txHash))) return;

  const { withStore } = await import("@/lib/store");
  const { creditConfirmedDeposit } = await import("@/lib/ledger");
  await withStore((store) => {
    creditConfirmedDeposit(store, input.userId, input.amount, txHash);
  });
}

async function claimWithdrawal(id: string, from: WithdrawalStatus | WithdrawalStatus[], to: WithdrawalStatus) {
  const allowed = (Array.isArray(from) ? from : [from]).map((status) => `'${esc(status)}'`).join(", ");
  const now = Date.now();
  const stamp = to === "sending" ? "" : `, resolvedAt = ${now}`;
  const changed = await prisma.$executeRawUnsafe(
    `UPDATE Withdrawal SET status = '${esc(to)}'${stamp} WHERE id = '${esc(id)}' AND status IN (${allowed})`,
  );
  return Number(changed) > 0;
}

export async function insertWithdrawal(row: {
  id: string;
  userId: string;
  networkId: string;
  address: string;
  amount: number;
  status: WithdrawalStatus;
  createdAt: number;
  note: string;
}) {
  await ensureChainTables();
  await prisma.$executeRawUnsafe(
    `INSERT INTO Withdrawal (id, userId, networkId, address, amount, status, createdAt, resolvedAt, note, txHash)
     VALUES ('${esc(row.id)}', '${esc(row.userId)}', '${esc(row.networkId)}', '${esc(row.address)}', ${row.amount}, '${esc(row.status)}', ${row.createdAt}, NULL, '${esc(row.note)}', '')`,
  );
}

export async function deleteWithdrawal(id: string) {
  await prisma.$executeRawUnsafe(`DELETE FROM Withdrawal WHERE id = '${esc(id)}'`);
}

export type PendingDeposit = {
  txHash: string;
  amount: number;
  confirmations: number;
  needed: number;
  blockNumber: number;
};

export type PublicPayout = {
  amount: number;
  at: number;
};

export async function pendingDepositsForUser(userId: string): Promise<PendingDeposit[]> {
  if (!chainWatchEnabled()) return [];
  await ensureChainTables();
  const wallet = await prisma.wallet.findFirst({
    where: { userId, network: LIVE_CHAIN_ID },
    select: { address: true },
  });
  if (!wallet?.address) return [];
  const needed = chainConfirms();
  let head = lastBlock;
  try {
    if (!head) head = await getProvider().getBlockNumber();
  } catch {
    return [];
  }
  const from = Math.max(0, head - needed - 2);
  const address = wallet.address.toLowerCase();
  let logs: Log[] = [];
  try {
    logs = await getTransferLogs(from, head, [address]);
  } catch {
    return [];
  }
  const creditedRows = await prisma
    .$queryRawUnsafe<{ txHash: string }[]>(
      `SELECT txHash FROM ChainDeposit WHERE userId = '${esc(userId)}'`,
    )
    .catch(() => [] as { txHash: string }[]);
  const credited = new Set(creditedRows.map((row) => row.txHash.toLowerCase()));
  const seen = new Set<string>();
  const pending: PendingDeposit[] = [];
  for (const log of logs) {
    const toTopic = log.topics[2];
    if (!toTopic) continue;
    const toAddress = `0x${toTopic.slice(26)}`.toLowerCase();
    if (toAddress !== address) continue;
    const hash = log.transactionHash.toLowerCase();
    if (credited.has(hash) || seen.has(hash)) continue;
    const confirmations = Math.max(0, head - log.blockNumber);
    if (confirmations >= needed) continue;
    const raw = Number(formatUnits(log.data, LIVE_USDT_DECIMALS));
    if (!Number.isFinite(raw) || raw <= 0) continue;
    seen.add(hash);
    pending.push({
      txHash: hash,
      amount: raw,
      confirmations,
      needed,
      blockNumber: log.blockNumber,
    });
  }
  pending.sort((a, b) => b.blockNumber - a.blockNumber);
  return pending.slice(0, 8);
}

export async function listPublicPayouts(limit = 8): Promise<PublicPayout[]> {
  const rows = await listWithdrawals("paid");
  return rows.slice(0, limit).map((row) => ({
    amount: row.amount,
    at: row.resolvedAt ?? row.createdAt,
  }));
}

export async function listWithdrawalsForUser(userId: string) {
  const rows = await listWithdrawals();
  return rows.filter((row) => row.userId === userId);
}

export async function listWithdrawals(status?: WithdrawalStatus) {
  await ensureChainTables();
  const rows = await prisma.$queryRawUnsafe<
    {
      id: string;
      userId: string;
      networkId: string;
      address: string;
      amount: number;
      status: string;
      createdAt: string | number | bigint;
      resolvedAt: string | number | bigint | null;
      note: string;
      txHash?: string | null;
    }[]
  >(
    status
      ? `SELECT id, userId, networkId, address, amount, status, CAST(createdAt AS TEXT) as createdAt, CAST(resolvedAt AS TEXT) as resolvedAt, note, txHash FROM Withdrawal WHERE status = '${esc(status)}' ORDER BY createdAt DESC LIMIT 80`
      : `SELECT id, userId, networkId, address, amount, status, CAST(createdAt AS TEXT) as createdAt, CAST(resolvedAt AS TEXT) as resolvedAt, note, txHash FROM Withdrawal ORDER BY createdAt DESC LIMIT 80`,
  );
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((row) => row.userId) } },
    select: { id: true, username: true },
  });
  const names = new Map(users.map((user) => [user.id, user.username]));
  return rows.map(
    (row): Withdrawal => ({
      id: row.id,
      userId: row.userId,
      username: names.get(row.userId),
      networkId: row.networkId as Withdrawal["networkId"],
      address: row.address,
      amount: fromCents(row.amount),
      status: row.status as WithdrawalStatus,
      createdAt: Number(row.createdAt),
      resolvedAt: row.resolvedAt == null || row.resolvedAt === "" ? null : Number(row.resolvedAt),
      note: row.note,
      txHash: row.txHash ?? "",
    }),
  );
}

export async function dailyWithdrawTotal(userId: string) {
  await ensureChainTables();
  const start = Date.now() - 24 * 60 * 60 * 1000;
  const rows = await prisma.$queryRawUnsafe<{ total: number | null }[]>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM Withdrawal
     WHERE userId = '${esc(userId)}' AND status != 'rejected' AND createdAt >= ${start}`,
  );
  return Number(rows[0]?.total ?? 0);
}

export async function resolveWithdrawal(
  id: string,
  action: "paid" | "rejected",
) {
  await ensureChainTables();
  const rows = await prisma.$queryRawUnsafe<
    {
      id: string;
      userId: string;
      amount: number;
      status: string;
      address: string;
      txHash?: string | null;
    }[]
  >(
    `SELECT id, userId, amount, status, address, txHash FROM Withdrawal WHERE id = '${esc(id)}' LIMIT 1`,
  );
  const row = rows[0];
  if (!row) throw new Error("That payout was not found.");
  if (row.status === "paid" || row.status === "rejected") {
    throw new Error("That payout is already resolved.");
  }
  if (action === "rejected" && row.status !== "queued") {
    throw new Error("That payout is already sending.");
  }

  const claimed = await claimWithdrawal(
    id,
    action === "rejected" ? "queued" : ["queued", "sending"],
    action,
  );
  if (!claimed) throw new Error("That payout is already resolved.");

  if (action === "rejected") {
    const { withStore } = await import("@/lib/store");
    const { refundQueuedWithdraw } = await import("@/lib/ledger");
    await withStore((store) => {
      refundQueuedWithdraw(store, row.userId, row.amount, row.address);
    });
  }
  await announcePayout(row.id, row.userId, row.amount, action, row.txHash ?? "");
}

const sending = new Set<string>();
const USDT_ABI = [
  "function transfer(address to, uint256 value)",
  "function balanceOf(address owner) view returns (uint256)",
];

export async function sendQueuedWithdrawal(id: string) {
  if (!withdrawSendEnabled()) {
    throw new Error("Set WITHDRAW_KEY and a BSC RPC to send on-chain. Or mark Paid after a manual send.");
  }
  if (sending.has(id)) throw new Error("That payout is already sending.");
  sending.add(id);
  try {
    await ensureChainTables();
    const rows = await prisma.$queryRawUnsafe<
      {
        id: string;
        userId: string;
        amount: number;
        status: string;
        address: string;
        txHash?: string | null;
      }[]
    >(
      `SELECT id, userId, amount, status, address, txHash FROM Withdrawal WHERE id = '${esc(id)}' LIMIT 1`,
    );
    const row = rows[0];
    if (!row) throw new Error("That payout was not found.");
    if (row.status === "paid" || row.status === "rejected") {
      throw new Error("That payout is already resolved.");
    }
    if (row.status === "queued") {
      const claimed = await claimWithdrawal(id, "queued", "sending");
      if (!claimed) throw new Error("That payout is already resolved.");
    } else if (row.status !== "sending") {
      throw new Error("That payout is already resolved.");
    }

    let hash = (row.txHash ?? "").trim();
    if (!hash) {
      const rpc = chainRpcUrl();
      const provider = new JsonRpcProvider(rpc, 56, { staticNetwork: true });
      const signer = new Wallet(withdrawKey(), provider);
      const usdt = new Contract(LIVE_USDT, USDT_ABI, signer);
      const cents = Math.round(Number(row.amount));
      if (cents < 1) throw new Error("That payout is empty.");
      const value = BigInt(cents) * BigInt(10) ** BigInt(LIVE_USDT_DECIMALS - 2);
      const [tokenBal, gasBal] = await Promise.all([
        usdt.balanceOf(signer.address) as Promise<bigint>,
        provider.getBalance(signer.address),
      ]);
      if (tokenBal < value) {
        throw new Error(
          `House USDT is short. Need ${fromCents(cents)} USDT in ${signer.address.slice(0, 6)}…${signer.address.slice(-4)}.`,
        );
      }
      if (gasBal === BigInt(0)) {
        throw new Error("House wallet needs BNB for gas.");
      }
      const token = usdt.getFunction("transfer");
      const tx = await token.send(row.address, value);
      hash = tx.hash;
      await prisma.$executeRawUnsafe(
        `UPDATE Withdrawal SET txHash = '${esc(hash)}', note = 'Broadcast ${hash}' WHERE id = '${esc(id)}'`,
      );
      await tx.wait(1);
    }

    const now = Date.now();
    const marked = await prisma.$executeRawUnsafe(
      `UPDATE Withdrawal SET status = 'paid', resolvedAt = ${now}, txHash = '${esc(hash)}', note = 'Sent ${hash}' WHERE id = '${esc(id)}' AND status IN ('queued', 'sending')`,
    );
    if (Number(marked) < 1) throw new Error("That payout is already resolved.");
    await announcePayout(row.id, row.userId, row.amount, "paid", hash);
  } catch (error) {
    const hasHash = await prisma.$queryRawUnsafe<{ txHash?: string | null }[]>(
      `SELECT txHash FROM Withdrawal WHERE id = '${esc(id)}' LIMIT 1`,
    );
    if (!(hasHash[0]?.txHash ?? "").trim()) {
      await prisma.$executeRawUnsafe(
        `UPDATE Withdrawal SET status = 'queued', resolvedAt = NULL WHERE id = '${esc(id)}' AND status = 'sending'`,
      );
    }
    throw error;
  } finally {
    sending.delete(id);
  }
}

async function announcePayout(
  payoutId: string,
  userId: string,
  amount: number,
  action: "paid" | "rejected",
  txHash: string,
) {
  const { formatCents } = await import("@/lib/money");
  const cents = Math.round(Number(amount));
  const { withStore } = await import("@/lib/store");
  const { notify } = await import("@/lib/notifications");
  await withStore((store) => {
    const row = store.txs.find((item) => item.id === payoutId);
    if (row && action === "paid") {
      row.note = txHash
        ? `Sent · BNB Chain ${txHash.slice(0, 10)}…`
        : `Paid · BNB Chain`;
    }
    notify(store, userId, {
      kind: action === "paid" ? "withdraw" : "refund",
      title: action === "paid" ? "Withdraw sent" : "Withdraw returned",
      body:
        action === "paid"
          ? txHash
            ? `${formatCents(cents)} USDT left on BNB Chain · ${txHash.slice(0, 10)}…`
            : `${formatCents(cents)} USDT was sent on BNB Chain.`
          : `${formatCents(cents)} USDT was put back in your bank.`,
      href: "/withdraw",
    });
  });
}

function esc(value: string) {
  return value.replace(/'/g, "''");
}
