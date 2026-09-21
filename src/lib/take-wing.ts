/**
 * Writes queued takes onto the wing. Kept off the USDT settle path so a hung
 * insert cannot freeze a flush of money rows.
 */

import { prisma } from "@/lib/db";
import { HOUSE_USER_ID } from "@/lib/house";
import { ensureSocialTables } from "@/lib/social";
import {
  queueTakeTalk,
  takeTalkFields,
  takeTalkPending,
  type TakeTalk,
} from "@/lib/take-talk";

async function insertTakeTalk(take: TakeTalk) {
  const fields = takeTalkFields(take);
  if (!fields.link) return 0;
  const at = take.at && take.at > 0 ? take.at : Date.now();
  const done = await prisma.$executeRaw`
    INSERT OR IGNORE INTO NetworkPost (id, userId, body, link, image, title, source, createdAt)
    VALUES (${fields.id}, ${HOUSE_USER_ID}, ${fields.body}, ${fields.link}, ${""},
            ${fields.title}, ${fields.source}, ${at})
  `;
  return Number(done);
}

export async function flushTakeTalks() {
  const rows = takeTalkPending();
  if (!rows.length) return 0;
  try {
    await ensureSocialTables();
    let posted = 0;
    for (const take of rows) posted += await insertTakeTalk(take);
    return posted;
  } catch {
    for (const take of rows) queueTakeTalk(take);
    return 0;
  }
}

/** Real settled takes only. INSERT OR IGNORE, so a second boot is quiet. */
export async function backfillTakeTalks(limit = 8) {
  const { listSettledRounds } = await import("@/lib/fairness-db");
  const { takeFromSettled } = await import("@/lib/takes");
  const rows = await listSettledRounds(undefined, Math.max(1, Math.min(12, limit)), "take");
  for (const row of rows) {
    const take = takeFromSettled(row);
    if (!take) continue;
    queueTakeTalk({
      id: take.id,
      names: take.names,
      amount: take.amount,
      roomName: take.roomName,
      at: take.at,
    });
  }
  return flushTakeTalks();
}
