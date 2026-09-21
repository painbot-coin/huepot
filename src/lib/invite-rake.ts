/** How much of a house rake cut an inviter gets. Prisma-free. */

export function lastInviteCredit(
  txs: { type: string; amount: number; note: string; createdAt: number }[],
) {
  const hit = txs.find((tx) => tx.type === "invite");
  if (!hit) return null;
  const from = /from @([A-Za-z0-9_]+)/.exec(hit.note)?.[1] ?? "";
  const room = /· ([^·]+) #\d+\s*$/.exec(hit.note)?.[1]?.trim() ?? "";
  return { amount: hit.amount, from, room, at: hit.createdAt, note: hit.note };
}

export function inviteCutCents(
  rake: number,
  playerLosing: number,
  losingClicks: number,
  shareBps: number,
  alreadyToday: number,
  cap: number,
) {
  if (rake <= 0 || playerLosing <= 0 || losingClicks <= 0 || shareBps <= 0) {
    return 0;
  }
  const playerRake = Math.floor((rake * playerLosing) / losingClicks);
  let cut = Math.floor((playerRake * shareBps) / 10_000);
  if (cut <= 0) return 0;
  return Math.min(cut, Math.max(0, cap - alreadyToday));
}
