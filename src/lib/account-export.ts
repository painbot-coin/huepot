import { prisma } from "@/lib/db";
import { userLimits } from "@/lib/limits";
import { fromCents } from "@/lib/money";
import { playerRecord } from "@/lib/record";
import type { StoreData, User } from "@/lib/types";

/**
 * Everything the house holds about one player, in the shape a person can
 * actually read. Their own rows only — the id is taken from the session, never
 * from the request.
 */
export async function accountExport(store: StoreData, user: User) {
  const limits = userLimits(user);

  const txs = await prisma.$queryRaw<
    { type: string; amount: number; createdAt: string; note: string }[]
  >`
    SELECT type, amount, CAST(createdAt AS TEXT) AS createdAt, note
      FROM Tx WHERE playerId = ${user.id} ORDER BY createdAt ASC
  `;

  const posts = await prisma.$queryRaw<{ body: string; createdAt: string }[]>`
    SELECT body, CAST(createdAt AS TEXT) AS createdAt
      FROM NetworkPost WHERE userId = ${user.id} ORDER BY createdAt ASC
  `;

  const comments = await prisma.$queryRaw<{ body: string; createdAt: string }[]>`
    SELECT body, CAST(createdAt AS TEXT) AS createdAt
      FROM NetworkComment WHERE userId = ${user.id} ORDER BY createdAt ASC
  `;

  const sent = await prisma.$queryRaw<{ body: string; createdAt: string }[]>`
    SELECT body, CAST(createdAt AS TEXT) AS createdAt
      FROM NetworkMessage WHERE fromId = ${user.id} ORDER BY createdAt ASC
  `;

  return {
    takenAt: new Date().toISOString(),
    account: {
      username: user.username,
      email: user.email,
      joined: new Date(user.createdAt).toISOString(),
      balance: fromCents(user.balance),
      headline: user.headline ?? "",
      about: user.about ?? "",
      location: user.location ?? "",
      avatar: user.avatar ?? "",
      pastNames: user.pastNames ?? [],
      withdrawAddress: user.withdrawAddress || null,
      inviteCode: user.inviteCode || null,
    },
    playLimits: {
      dailyLossCap: fromCents(limits.dailyLossCap),
      coolOffUntil: limits.coolOffUntil ? new Date(limits.coolOffUntil).toISOString() : null,
      selfExcludeUntil: limits.selfExcludeUntil
        ? new Date(limits.selfExcludeUntil).toISOString()
        : null,
      frozenByStaff: limits.frozen,
    },
    record: await playerRecord(user.id),
    // Amounts are in USDT here rather than cents, to match what was on screen.
    ledger: txs.map((tx) => ({
      at: new Date(Number(tx.createdAt)).toISOString(),
      type: tx.type,
      amount: fromCents(tx.amount),
      note: tx.note,
    })),
    posts: posts.map((row) => ({
      at: new Date(Number(row.createdAt)).toISOString(),
      body: row.body,
    })),
    comments: comments.map((row) => ({
      at: new Date(Number(row.createdAt)).toISOString(),
      body: row.body,
    })),
    messagesSent: sent.map((row) => ({
      at: new Date(Number(row.createdAt)).toISOString(),
      body: row.body,
    })),
  };
}
