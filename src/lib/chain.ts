import {
  Contract,
  JsonRpcProvider,
  Wallet,
  formatUnits,
  id,
  parseEther,
  zeroPadValue,
  type Log,
} from "ethers";
import { decryptSecret } from "@/lib/secret";
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
import { isBscTxHash, usdtTransfersTo } from "@/lib/deposit-claim";
import { fromCents, toCents } from "@/lib/money";
import { networkById } from "@/lib/networks";
import {
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
import type { Withdrawal, WithdrawalStatus } from "@/lib/types";

const TRANSFER_TOPIC = id("Transfer(address,address,uint256)");
const SCAN_ID = LIVE_CHAIN_ID;
const LOOKBACK = 2_000;

let started = false;
let scanning = false;
let lastError = "";
let lastScanAt = 0;
let scannedBlock = 0;
let lastBlock = 0;
let seedIndex = 0;
let abandonedDedicated = false;
let provider: JsonRpcProvider | null = null;
let providerUrl = "";
let nextDelayMs = 20_000;
const claimWait = new Map<string, number>();

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
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ChainSweep (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      address TEXT NOT NULL,
      amount REAL NOT NULL,
      txHash TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    )
  `);
}

function usesPublicSeed() {
  return abandonedDedicated || !process.env.BSC_RPC_URL;
}

function chunkBlocks() {
  return usesPublicSeed() ? 32 : 800;
}

function addressChunk() {
  return usesPublicSeed() ? 1 : 20;
}

function withTimeout<T>(work: Promise<T>, ms: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function shortScanError(error: unknown) {
  if (isDeadDedicatedRpc(error) && !usesPublicSeed()) return deadRpcNotice();
  if (isSeedRefusal(error)) return rateLimitNotice();
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
  return pickWatchRpcUrl(process.env.BSC_RPC_URL ?? "", abandonedDedicated, seedIndex);
}

function abandonDedicated(error: unknown) {
  if (abandonedDedicated || !process.env.BSC_RPC_URL) return false;
  if (!isDeadDedicatedRpc(error)) return false;
  abandonedDedicated = true;
  provider = null;
  return true;
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
  retried = false,
): Promise<Log[]> {
  const topics = [
    TRANSFER_TOPIC,
    null,
    addresses.length === 1
      ? zeroPadValue(addresses[0], 32)
      : addresses.map((address) => zeroPadValue(address, 32)),
  ];
  try {
    return await withTimeout(
      getProvider().getLogs({
        address: LIVE_USDT,
        fromBlock: from,
        toBlock: to,
        topics,
      }),
      8_000,
      "eth_getLogs",
    );
  } catch (error) {
    if (abandonDedicated(error)) {
      return getTransferLogs(from, to, addresses, depth, retried);
    }
    if (!isSeedRefusal(error)) throw error;
    rotateSeed();
    if (!retried) {
      await sleep(600);
      return getTransferLogs(from, to, addresses, depth, true);
    }
    if (!isRpcSlow(error) || to <= from || depth >= 3) throw error;
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
    const scan = scanChain().catch((error) => {
      if (abandonDedicated(error)) {
        lastError = deadRpcNotice();
        nextDelayMs = 4_000;
        return;
      }
      lastError = shortScanError(error);
      nextDelayMs = isRpcSlow(error) ? 15_000 : 20_000;
    });
    void scan.finally(() => {
      setTimeout(tick, nextDelayMs);
    });
    void scan
      .then(() => drainQueuedWithdrawals().catch(() => undefined))
      .then(() => sweepDueInboxes().catch(() => undefined));
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
    scannedBlock,
    lastScanAt,
    lastError: lastError || null,
    catchingUp: isCatchingUp(lastBlock, scannedBlock),
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

let houseStatusAt = 0;
let houseStatusCache: HouseWalletStatus | null = null;
const HOUSE_STATUS_TTL = 15_000;

export function clearHouseWalletStatus() {
  houseStatusAt = 0;
  houseStatusCache = null;
}

export async function houseWalletStatus(): Promise<HouseWalletStatus> {
  if (houseStatusCache && Date.now() - houseStatusAt < HOUSE_STATUS_TTL) {
    return houseStatusCache;
  }
  const address = houseWalletAddress();
  const empty: HouseWalletStatus = {
    canSend: withdrawSendEnabled(),
    address,
    usdt: 0,
    bnb: 0,
    ready: false,
  };
  if (!address || !chainRpcUrl()) {
    houseStatusCache = empty;
    houseStatusAt = Date.now();
    return empty;
  }
  try {
    const provider = new JsonRpcProvider(activeRpcUrl(), 56, { staticNetwork: true });
    const token = new Contract(LIVE_USDT, ["function balanceOf(address owner) view returns (uint256)"], provider);
    const [tokenBal, gasBal] = await withTimeout(
      Promise.all([
        token.balanceOf(address) as Promise<bigint>,
        provider.getBalance(address),
      ]),
      8_000,
      "house wallet",
    );
    const usdt = Number(formatUnits(tokenBal, LIVE_USDT_DECIMALS));
    const bnb = Number(formatUnits(gasBal, 18));
    const status: HouseWalletStatus = {
      canSend: true,
      address,
      usdt,
      bnb,
      ready: tokenBal > BigInt(0) && gasBal > BigInt(0),
    };
    houseStatusCache = status;
    houseStatusAt = Date.now();
    return status;
  } catch {
    houseStatusCache = empty;
    houseStatusAt = Date.now();
    return empty;
  }
}

export async function scanChain() {
  if (scanning || !chainWatchEnabled()) return chainStatus();
  scanning = true;
  try {
    await ensureChainTables();
    const head = await withTimeout(getProvider().getBlockNumber(), 8_000, "eth_blockNumber");
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
    if (saved > scannedBlock) scannedBlock = saved;
    const from = usesPublicSeed()
      ? publicCatchUpFrom(saved, safeHead, LOOKBACK)
      : saved > 0
        ? saved + 1
        : Math.max(0, safeHead - LOOKBACK);
    if (usesPublicSeed() && saved > 0 && from > saved + 1) {
      lastError = skipArchiveNotice();
    }
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
    scannedBlock = to;
    lastError = "";
    nextDelayMs = safeHead - to > chunkBlocks() * 4 ? 4_000 : 20_000;
    return chainStatus();
  } catch (error) {
    if (abandonDedicated(error)) {
      lastError = deadRpcNotice();
      nextDelayMs = 4_000;
      return chainStatus();
    }
    lastError = shortScanError(error);
    nextDelayMs = isRpcSlow(error) ? 15_000 : 20_000;
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

/** A log recorded this recently may still have its credit in flight. */
const REPAIR_AFTER_MS = 10 * 60 * 1000;

/**
 * True only when a recorded log has no credit and is old enough that no
 * attempt can still be writing one.
 */
async function creditWentMissing(txHash: string, logIndex: number) {
  const rows = await prisma.$queryRaw<{ createdAt: string }[]>`
    SELECT CAST(createdAt AS TEXT) AS createdAt FROM ChainDeposit
     WHERE txHash = ${txHash} AND logIndex = ${logIndex} LIMIT 1
  `;
  if (!rows.length) return false;
  if (Date.now() - Number(rows[0].createdAt) < REPAIR_AFTER_MS) return false;
  return !(await depositAlreadyCredited(txHash));
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

  // One recorded log, one credit. A failed insert means this log was already
  // recorded, so its credit has landed or is landing on another attempt;
  // crediting regardless is how a single deposit gets paid twice. Only a row
  // too old for a credit to still be in flight is a real loss worth repairing.
  if (!inserted && !(await creditWentMissing(txHash, input.logIndex))) return;

  const { withStore } = await import("@/lib/store");
  const { creditConfirmedDeposit } = await import("@/lib/ledger");
  await withStore((store) =>
    creditConfirmedDeposit(store, input.userId, input.amount, txHash),
  );
}

export type ClaimedDeposit = {
  credited: boolean;
  already: boolean;
  amount: number;
  txHash: string;
};

function claimFail(message: string, status = 400): never {
  const error = new Error(message);
  (error as Error & { status?: number }).status = status;
  throw error;
}

function gateClaim(key: string) {
  const now = Date.now();
  const prev = claimWait.get(key) ?? 0;
  if (now - prev < 8_000) claimFail("Wait a moment, then try again.", 429);
  claimWait.set(key, now);
}

/** Credit a send from its hash when the log cursor skipped those blocks. */
export async function claimDepositByHash(txHash: string, onlyUserId?: string) {
  if (!chainWatchEnabled()) claimFail("Chain watch is off.");
  const hash = txHash.trim();
  if (!isBscTxHash(hash)) claimFail("Paste a BscScan hash.");
  gateClaim(onlyUserId || hash.toLowerCase());
  await ensureChainTables();

  let receipt;
  try {
    receipt = await withTimeout(
      getProvider().getTransactionReceipt(hash),
      8_000,
      "eth_getTransactionReceipt",
    );
  } catch {
    claimFail("Could not read that send. Try again.");
  }
  if (!receipt) claimFail("That send was not found.");
  if (Number(receipt.status) !== 1) claimFail("That send failed on chain.");
  if (!receipt.blockNumber) claimFail("That send is still waiting on chain.");

  let head = lastBlock;
  try {
    if (!head) head = await withTimeout(getProvider().getBlockNumber(), 8_000, "eth_blockNumber");
  } catch {
    claimFail("Could not read the chain head.");
  }
  const needed = chainConfirms();
  const confirmations = Math.max(0, head - receipt.blockNumber);
  if (confirmations < needed) {
    claimFail(`Waiting on chain. ${confirmations}/${needed} confirms.`);
  }

  const wallets = await prisma.wallet.findMany({
    where: {
      network: LIVE_CHAIN_ID,
      ...(onlyUserId ? { userId: onlyUserId } : {}),
    },
    select: { userId: true, address: true },
  });
  if (!wallets.length) claimFail("No live BNB Chain address yet.");

  let creditedCents = 0;
  let already = false;
  for (const wallet of wallets) {
    const hits = usdtTransfersTo(
      receipt.logs,
      LIVE_USDT,
      wallet.address,
      receipt.logs[0]?.transactionHash || hash,
    );
    for (const hit of hits) {
      const amount = toCents(Number(formatUnits(hit.data, LIVE_USDT_DECIMALS)));
      if (!Number.isFinite(amount) || amount < 1) continue;
      if (await depositAlreadyCredited(hit.txHash || hash.toLowerCase())) {
        already = true;
        continue;
      }
      await creditLog({
        userId: wallet.userId,
        address: wallet.address.toLowerCase(),
        amount,
        txHash: hit.txHash || hash.toLowerCase(),
        logIndex: hit.logIndex,
        blockNumber: hit.blockNumber || receipt.blockNumber,
      });
      creditedCents += amount;
    }
  }

  if (creditedCents > 0) {
    return {
      credited: true,
      already: false,
      amount: fromCents(creditedCents),
      txHash: hash.toLowerCase(),
    };
  }
  if (already) {
    return {
      credited: false,
      already: true,
      amount: 0,
      txHash: hash.toLowerCase(),
    };
  }
  claimFail(
    onlyUserId
      ? "That hash did not send USDT to your deposit address."
      : "That hash did not send USDT to a house address.",
  );
}

// Terminal states only. A failed send reverts `sending` back to `queued`
// without touching the note, so noting `sending` would leave a queued row
// claiming to be on its way.
const CLAIM_NOTE: Partial<Record<WithdrawalStatus, string>> = {
  paid: "Sent on chain",
  rejected: "Rejected by staff · balance refunded",
};

async function claimWithdrawal(id: string, from: WithdrawalStatus | WithdrawalStatus[], to: WithdrawalStatus) {
  const allowed = (Array.isArray(from) ? from : [from]).map((status) => `'${esc(status)}'`).join(", ");
  const now = Date.now();
  const stamp = to === "sending" ? "" : `, resolvedAt = ${now}`;
  // Move the note with the status. A rejected row still reading "Queued for
  // send" is a misleading audit trail, and the books are read off these rows.
  const note = CLAIM_NOTE[to] ? `, note = '${esc(CLAIM_NOTE[to]!)}'` : "";
  const changed = await prisma.$executeRawUnsafe(
    `UPDATE Withdrawal SET status = '${esc(to)}'${stamp}${note} WHERE id = '${esc(id)}' AND status IN (${allowed})`,
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
  txHash: string;
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
    if (!head) head = await withTimeout(getProvider().getBlockNumber(), 8_000, "eth_blockNumber");
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
  return rows
    .filter((row) => (row.txHash ?? "").trim())
    .slice(0, limit)
    .map((row) => ({
      amount: row.amount,
      at: row.resolvedAt ?? row.createdAt,
      txHash: (row.txHash ?? "").trim(),
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
const sweeping = { busy: false };
const USDT_ABI = [
  "function transfer(address to, uint256 value)",
  "function balanceOf(address owner) view returns (uint256)",
];
const SWEEP_GAS_TOPUP = parseEther("0.0001");
const SWEEP_GAS_MIN = parseEther("0.00004");
const SWEEP_MIN_USDT = BigInt(10) ** BigInt(LIVE_USDT_DECIMALS - 2);

export type InboxHolding = {
  usdt: number;
  count: number;
};

export type InboxSweep = {
  address: string;
  amount: number;
  txHash: string;
  ok: boolean;
  error?: string;
};

export async function inboxHoldings(): Promise<InboxHolding> {
  const empty = { usdt: 0, count: 0 };
  if (!chainRpcUrl()) return empty;
  const house = houseWalletAddress().toLowerCase();
  try {
    const provider = new JsonRpcProvider(activeRpcUrl(), 56, { staticNetwork: true });
    const token = new Contract(LIVE_USDT, USDT_ABI, provider);
    const wallets = await prisma.wallet.findMany({
      where: { network: LIVE_CHAIN_ID },
      select: { address: true },
    });
    let usdt = 0;
    let count = 0;
    for (const row of wallets) {
      if (row.address.toLowerCase() === house) continue;
      const bal = (await withTimeout(
        token.balanceOf(row.address) as Promise<bigint>,
        8_000,
        "inbox balance",
      ));
      if (bal < SWEEP_MIN_USDT) continue;
      usdt += Number(formatUnits(bal, LIVE_USDT_DECIMALS));
      count += 1;
    }
    return { usdt, count };
  } catch {
    return empty;
  }
}

export async function listSweeps(take = 12) {
  await ensureChainTables();
  const rows = await prisma.$queryRawUnsafe<
    { address: string; amount: number; txHash: string; createdAt: number | bigint | string }[]
  >(
    `SELECT address, amount, txHash, CAST(createdAt AS TEXT) as createdAt FROM ChainSweep ORDER BY createdAt DESC LIMIT ${Math.max(1, Math.min(40, take))}`,
  );
  return rows.map((row) => ({
    address: row.address,
    amount: fromCents(row.amount),
    txHash: row.txHash,
    at: Number(row.createdAt),
  }));
}

async function recordSweep(userId: string, address: string, cents: number, txHash: string) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO ChainSweep (id, userId, address, amount, txHash, createdAt)
     VALUES ('${esc(crypto.randomUUID())}', '${esc(userId)}', '${esc(address)}', ${cents}, '${esc(txHash)}', ${Date.now()})`,
  );
}

async function sweepOneInbox(
  provider: JsonRpcProvider,
  house: string,
  row: { userId: string; address: string; secretEnc: string },
): Promise<InboxSweep | null> {
  if (row.address.toLowerCase() === house.toLowerCase()) return null;
  const tokenView = new Contract(LIVE_USDT, USDT_ABI, provider);
  const bal = await withTimeout(
    tokenView.balanceOf(row.address) as Promise<bigint>,
    8_000,
    "inbox balance",
  );
  if (bal < SWEEP_MIN_USDT) return null;
  const inbox = new Wallet(decryptSecret(row.secretEnc), provider);
  if (inbox.address.toLowerCase() !== row.address.toLowerCase()) {
    throw new Error("Inbox key does not match the address.");
  }
  const gasBal = await withTimeout(provider.getBalance(inbox.address), 8_000, "inbox gas");
  if (gasBal < SWEEP_GAS_MIN) {
    const funder = new Wallet(withdrawKey(), provider);
    const fundGas = await withTimeout(provider.getBalance(funder.address), 8_000, "house gas");
    if (fundGas < SWEEP_GAS_TOPUP * BigInt(2)) {
      throw new Error("House wallet needs more BNB to move inbox USDT.");
    }
    const top = await funder.sendTransaction({ to: inbox.address, value: SWEEP_GAS_TOPUP });
    await withTimeout(top.wait(1), 20_000, "sweep gas wait");
  }
  const usdt = new Contract(LIVE_USDT, USDT_ABI, inbox);
  const sent = await usdt.getFunction("transfer").send(house, bal);
  await withTimeout(sent.wait(1), 20_000, "sweep wait");
  const cents = Math.round(Number(formatUnits(bal, LIVE_USDT_DECIMALS)) * 100);
  await recordSweep(row.userId, row.address, cents, sent.hash);
  return { address: row.address, amount: fromCents(cents), txHash: sent.hash, ok: true };
}

export async function sweepDueInboxes(): Promise<InboxSweep[]> {
  if (!withdrawSendEnabled() || sweeping.busy) return [];
  sweeping.busy = true;
  const results: InboxSweep[] = [];
  try {
    await ensureChainTables();
    const house = houseWalletAddress();
    if (!house) return [];
    const provider = new JsonRpcProvider(activeRpcUrl(), 56, { staticNetwork: true });
    const wallets = await prisma.wallet.findMany({
      where: { network: LIVE_CHAIN_ID },
      select: { userId: true, address: true, secretEnc: true },
    });
    for (const row of wallets) {
      try {
        const item = await sweepOneInbox(provider, house, row);
        if (item) results.push(item);
      } catch (error) {
        results.push({
          address: row.address,
          amount: 0,
          txHash: "",
          ok: false,
          error: error instanceof Error ? error.message.split("\n")[0] ?? "Sweep failed" : "Sweep failed",
        });
      }
    }
    clearHouseWalletStatus();
    return results;
  } finally {
    sweeping.busy = false;
  }
}

export async function drainQueuedWithdrawals() {
  if (!withdrawSendEnabled()) return;
  const rows = await listWithdrawals("queued");
  for (const row of [...rows].reverse()) {
    try {
      await sendQueuedWithdrawal(row.id);
    } catch {
      break;
    }
  }
}

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
    const provider = new JsonRpcProvider(activeRpcUrl(), 56, { staticNetwork: true });
    if (!hash) {
      const signer = new Wallet(withdrawKey(), provider);
      const usdt = new Contract(LIVE_USDT, USDT_ABI, signer);
      const cents = Math.round(Number(row.amount));
      if (cents < 1) throw new Error("That payout is empty.");
      const value = BigInt(cents) * BigInt(10) ** BigInt(LIVE_USDT_DECIMALS - 2);
      const [tokenBal, gasBal] = await withTimeout(
        Promise.all([
          usdt.balanceOf(signer.address) as Promise<bigint>,
          provider.getBalance(signer.address),
        ]),
        8_000,
        "house wallet",
      );
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
        // Escaped in both places. A chain hash is hex so neither could break
        // out today, but the same value quoted two different ways is how the
        // habit rots: the next person copies the looser half.
        `UPDATE Withdrawal SET txHash = '${esc(hash)}', note = 'Broadcast ${esc(hash)}' WHERE id = '${esc(id)}'`,
      );
    }
    const mined = await withTimeout(provider.waitForTransaction(hash, 1), 20_000, "withdraw wait");
    if (!mined || Number(mined.status) !== 1) throw new Error("That send did not land.");

    const now = Date.now();
    const marked = await prisma.$executeRawUnsafe(
      `UPDATE Withdrawal SET status = 'paid', resolvedAt = ${now}, txHash = '${esc(hash)}', note = 'Sent ${esc(hash)}' WHERE id = '${esc(id)}' AND status IN ('queued', 'sending')`,
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
    clearHouseWalletStatus();
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
  const { queueEmail } = await import("@/lib/email");
  const { withdrawPaidMail } = await import("@/lib/email-copy");
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
    // Only the paid side. A rejection is already mailed from
    // refundQueuedWithdraw, and hooking both would send two receipts.
    const user = store.users[userId];
    if (action === "paid" && user) {
      queueEmail({
        userId,
        to: user.email,
        kind: "withdraw-paid",
        ...withdrawPaidMail({
          username: user.username,
          cents,
          network: "BNB Chain",
          txHash,
          explorer: "https://bscscan.com",
        }),
      });
    }
  });
}

function esc(value: string) {
  return value.replace(/'/g, "''");
}
