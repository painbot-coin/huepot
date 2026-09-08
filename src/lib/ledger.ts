import { LIVE_CHAIN_ID } from "@/lib/config";
import { prisma } from "@/lib/db";
import { queueEmail } from "@/lib/email";
import { depositCreditedMail, withdrawReturnedMail } from "@/lib/email-copy";
import { notePlayTx } from "@/lib/limits";
import { formatCents } from "@/lib/money";
import { networkById } from "@/lib/networks";
import { notify } from "@/lib/notifications";
import type { StoreData } from "@/lib/types";

/**
 * `store.txs` keeps only the newest 400 rows, so memory alone cannot say
 * whether an older deposit was already credited. The Tx table can.
 */
async function alreadyCredited(store: StoreData, txHash: string) {
  if (store.txs.some((tx) => tx.type === "deposit" && tx.note.includes(txHash))) {
    return true;
  }
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM Tx WHERE type = 'deposit' AND note LIKE ${`%${txHash}%`} LIMIT 1
  `;
  return rows.length > 0;
}

export async function creditConfirmedDeposit(
  store: StoreData,
  userId: string,
  amount: number,
  txHash: string,
) {
  const user = store.users[userId];
  if (!user) return false;
  if (await alreadyCredited(store, txHash)) return false;
  const credit = Math.round(amount);
  if (credit < 1) return false;
  const network = networkById(LIVE_CHAIN_ID);
  user.balance += credit;
  store.txs.unshift({
    id: crypto.randomUUID(),
    playerId: userId,
    type: "deposit",
    amount: credit,
    createdAt: Date.now(),
    note: `${network.standard} ${network.asset} · ${txHash}`,
  });
  store.txs = store.txs.slice(0, 400);
  notify(store, userId, {
    kind: "deposit",
    title: "Deposit credited",
    body: `${formatCents(credit)} USDT on ${network.name} is in your bank. Classic sits 20:00 UTC. Fog cup Sunday 21:00 UTC.`,
    href: "/rooms/classic",
  });
  const mail = depositCreditedMail({
    username: user.username,
    cents: credit,
    network: network.name,
    txHash,
  });
  queueEmail({ userId, to: user.email, kind: "deposit", ...mail });
  return true;
}

export function refundQueuedWithdraw(
  store: StoreData,
  userId: string,
  amount: number,
  address: string,
) {
  const user = store.users[userId];
  if (!user) return;
  const credit = Math.round(amount);
  user.balance += credit;
  notePlayTx(userId, "refund", credit);
  store.txs.unshift({
    id: crypto.randomUUID(),
    playerId: userId,
    type: "refund",
    amount: credit,
    createdAt: Date.now(),
    note: `Withdraw returned · ${address.slice(0, 6)}…${address.slice(-4)}`,
  });
  store.txs = store.txs.slice(0, 400);
  notify(store, userId, {
    kind: "refund",
    title: "Withdraw returned",
    body: `${formatCents(credit)} USDT was put back in your bank.`,
    href: "/withdraw",
  });
  queueEmail({
    userId,
    to: user.email,
    kind: "withdraw-returned",
    ...withdrawReturnedMail({ username: user.username, cents: credit }),
  });
}
