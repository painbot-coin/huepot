/**
 * Queue and send standing HUE on BSC testnet.
 *
 * Kept out of chain.ts on purpose. A hung token transfer here must not leave
 * the USDT watcher mid-tick. The hot key is not the treasury deployer key.
 */

import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { prisma } from "@/lib/db";
import {
  HUE_TESTNET_CHAIN_ID,
  claimableHue,
  hueConfigured,
  hueHotKey,
  hueRpcUrl,
  hueToBaseUnits,
  hueToken,
  isHueAddress,
  sentHue,
  type HueClaim,
  type HueClaimStatus,
} from "@/lib/hue-claim";
import { boardPlaceFor } from "@/lib/board-sit";
import { listHouseBoard, playerRecord } from "@/lib/record";

const HUE_ABI = [
  "function transfer(address to, uint256 value) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
];

const sending = new Set<string>();
let tablesReady = false;

function esc(value: string) {
  return value.replace(/'/g, "''");
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

function asStatus(value: string): HueClaimStatus {
  if (value === "sending" || value === "paid" || value === "rejected") return value;
  return "queued";
}

export async function ensureHueTables() {
  if (tablesReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS HueClaim (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      address TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      resolvedAt INTEGER,
      note TEXT NOT NULL DEFAULT '',
      txHash TEXT NOT NULL DEFAULT ''
    )
  `);
  tablesReady = true;
}

function mapRow(row: {
  id: string;
  userId: string;
  address: string;
  amount: number;
  status: string;
  createdAt: unknown;
  resolvedAt: unknown;
  note: string;
  txHash: string;
  username?: string | null;
}): HueClaim {
  return {
    id: row.id,
    userId: row.userId,
    address: row.address,
    amount: Number(row.amount) || 0,
    status: asStatus(row.status),
    createdAt: Number(row.createdAt) || 0,
    resolvedAt: row.resolvedAt == null ? null : Number(row.resolvedAt),
    note: row.note || "",
    txHash: row.txHash || "",
    username: row.username || undefined,
  };
}

export async function listHueClaimsForUser(userId: string): Promise<HueClaim[]> {
  await ensureHueTables();
  const rows = await prisma.$queryRawUnsafe<
    {
      id: string;
      userId: string;
      address: string;
      amount: number;
      status: string;
      createdAt: unknown;
      resolvedAt: unknown;
      note: string;
      txHash: string;
    }[]
  >(
    `SELECT id, userId, address, amount, status, createdAt, resolvedAt, note, txHash
       FROM HueClaim WHERE userId = '${esc(userId)}' ORDER BY createdAt DESC LIMIT 40`,
  );
  return rows.map(mapRow);
}

export async function listHueClaims(): Promise<HueClaim[]> {
  await ensureHueTables();
  const rows = await prisma.$queryRawUnsafe<
    {
      id: string;
      userId: string;
      address: string;
      amount: number;
      status: string;
      createdAt: unknown;
      resolvedAt: unknown;
      note: string;
      txHash: string;
      username: string | null;
    }[]
  >(
    `SELECT c.id, c.userId, c.address, c.amount, c.status, c.createdAt, c.resolvedAt,
            c.note, c.txHash, u.username AS username
       FROM HueClaim c
       LEFT JOIN User u ON u.id = c.userId
      ORDER BY c.createdAt DESC LIMIT 80`,
  );
  return rows.map(mapRow);
}

export async function hueClaimPack(userId: string) {
  const [record, claims, seats, user] = await Promise.all([
    playerRecord(userId),
    listHueClaimsForUser(userId),
    listHouseBoard(),
    prisma.user.findUnique({ where: { id: userId }, select: { username: true } }),
  ]);
  return {
    configured: hueConfigured(),
    coin: record.coin,
    place: boardPlaceFor(seats, user?.username ?? ""),
    claimable: claimableHue(record.coin, claims),
    sent: sentHue(claims),
    claims,
  };
}

export async function queueHueClaim(userId: string, address: string, amount?: number) {
  if (!hueConfigured()) {
    throw new Error("HUE testnet send is not on.");
  }
  const dest = address.trim();
  if (!isHueAddress(dest)) throw new Error("Paste a BNB Chain address.");

  await ensureHueTables();
  const pack = await hueClaimPack(userId);
  const want =
    amount == null || !Number.isFinite(Number(amount))
      ? pack.claimable
      : Math.max(0, Math.floor(Number(amount)));
  if (want < 1) throw new Error("No HUE to claim yet. Sit a table.");
  if (want > pack.claimable) throw new Error("That is more HUE than this seat has left.");

  const id = crypto.randomUUID();
  const now = Date.now();
  await prisma.$executeRaw`
    INSERT INTO HueClaim (id, userId, address, amount, status, createdAt, resolvedAt, note, txHash)
    VALUES (${id}, ${userId}, ${dest}, ${want}, ${"queued"}, ${now}, ${null}, ${""}, ${""})
  `;
  const again = await hueClaimPack(userId);
  if (again.sent > Math.floor(again.coin)) {
    await prisma.$executeRawUnsafe(`DELETE FROM HueClaim WHERE id = '${esc(id)}'`);
    throw new Error("That HUE was already claimed.");
  }
  return id;
}

export async function rejectHueClaim(id: string) {
  await ensureHueTables();
  const now = Date.now();
  const marked = await prisma.$executeRaw`
    UPDATE HueClaim SET status = ${"rejected"}, resolvedAt = ${now}, note = ${"Returned to standing"}
     WHERE id = ${id} AND status = ${"queued"}
  `;
  if (Number(marked) < 1) throw new Error("That claim is already moving.");
}

export async function sendQueuedHueClaim(id: string) {
  if (!hueConfigured()) throw new Error("HUE testnet send is not on.");
  if (sending.has(id)) throw new Error("That claim is already sending.");
  sending.add(id);
  try {
    await ensureHueTables();
    const rows = await prisma.$queryRawUnsafe<
      { id: string; userId: string; amount: number; status: string; address: string; txHash: string }[]
    >(
      `SELECT id, userId, amount, status, address, txHash FROM HueClaim WHERE id = '${esc(id)}' LIMIT 1`,
    );
    const row = rows[0];
    if (!row) throw new Error("That claim was not found.");
    if (row.status === "paid" || row.status === "rejected") {
      throw new Error("That claim is already resolved.");
    }
    if (row.status === "queued") {
      const claimed = await prisma.$executeRawUnsafe(
        `UPDATE HueClaim SET status = 'sending' WHERE id = '${esc(id)}' AND status = 'queued'`,
      );
      if (Number(claimed) < 1) throw new Error("That claim is already resolved.");
    } else if (row.status !== "sending") {
      throw new Error("That claim is already resolved.");
    }

    let hash = (row.txHash ?? "").trim();
    const provider = new JsonRpcProvider(hueRpcUrl(), HUE_TESTNET_CHAIN_ID, {
      staticNetwork: true,
    });
    const net = await withTimeout(provider.getNetwork(), 8_000, "hue network");
    if (Number(net.chainId) !== HUE_TESTNET_CHAIN_ID) {
      throw new Error("HUE send is testnet only.");
    }
    if (!hash) {
      const signer = new Wallet(hueHotKey(), provider);
      const token = new Contract(hueToken(), HUE_ABI, signer);
      const value = hueToBaseUnits(Number(row.amount));
      if (value < 1n) throw new Error("That claim is empty.");
      const [held, gas] = await withTimeout(
        Promise.all([
          token.balanceOf(signer.address) as Promise<bigint>,
          provider.getBalance(signer.address),
        ]),
        8_000,
        "hue wallet",
      );
      if (held < value) throw new Error("HUE treasury is short on testnet.");
      if (gas === 0n) throw new Error("HUE hot wallet needs testnet BNB for gas.");
      const tx = await token.getFunction("transfer").send(row.address, value);
      hash = tx.hash;
      await prisma.$executeRawUnsafe(
        `UPDATE HueClaim SET txHash = '${esc(hash)}', note = 'Broadcast ${esc(hash)}' WHERE id = '${esc(id)}'`,
      );
    }
    const mined = await withTimeout(provider.waitForTransaction(hash, 1), 20_000, "hue wait");
    if (!mined || Number(mined.status) !== 1) throw new Error("That send did not land.");
    const now = Date.now();
    const marked = await prisma.$executeRaw`
      UPDATE HueClaim SET status = ${"paid"}, resolvedAt = ${now}, txHash = ${hash}, note = ${`Sent ${hash}`}
       WHERE id = ${id} AND status IN (${"queued"}, ${"sending"})
    `;
    if (Number(marked) < 1) throw new Error("That claim is already resolved.");
    await announceHue(row.userId, hash, Number(row.amount));
  } catch (error) {
    const hasHash = await prisma.$queryRawUnsafe<{ txHash?: string | null }[]>(
      `SELECT txHash FROM HueClaim WHERE id = '${esc(id)}' LIMIT 1`,
    );
    if (!(hasHash[0]?.txHash ?? "").trim()) {
      await prisma.$executeRawUnsafe(
        `UPDATE HueClaim SET status = 'queued', resolvedAt = NULL WHERE id = '${esc(id)}' AND status = 'sending'`,
      );
    }
    throw error;
  } finally {
    sending.delete(id);
  }
}

async function announceHue(userId: string, txHash: string, amount: number) {
  if (!userId) return;
  const { withStore } = await import("@/lib/store");
  const { notify } = await import("@/lib/notifications");
  await withStore((store) => {
    notify(store, userId, {
      kind: "system",
      title: "HUE sent",
      body: `${amount} HUE left on BSC testnet · ${txHash.slice(0, 10)}…`,
    });
  });
}
