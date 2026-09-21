import { randomBytes } from "crypto";
import { classicHourClock, classicHourUtc } from "./classic-hour";
import { INVITE_DAILY_CAP, INVITE_RAKE_SHARE_BPS } from "./config";
import { prisma } from "./db";
import { inviteCreditMail } from "./email-copy";
import { queueEmail } from "./email";
import { isHouseUser } from "./house";
import { inviteCutCents } from "./invite-rake";
import { formatCents, toCents } from "./money";
import { nightHourClock, nightHourUtc } from "./night-hour";
import { notify } from "./notifications";
import type { ColorId } from "./colors";
import type { StoreData, Tx, User } from "./types";

export const FIRST_CLICK_INVITE_TITLE = "Bring someone";

const inviteToday = new Map<string, { day: number; cents: number }>();
const inviteLife = new Map<string, number>();

const CODE_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function inviteRakeShareBps() {
  const value = Number(process.env.INVITE_RAKE_SHARE_BPS ?? INVITE_RAKE_SHARE_BPS);
  if (!Number.isFinite(value)) return INVITE_RAKE_SHARE_BPS;
  return Math.max(0, Math.min(10_000, Math.floor(value)));
}

export function inviteDailyCapCents() {
  const value = Number(process.env.INVITE_DAILY_CAP ?? INVITE_DAILY_CAP);
  if (!Number.isFinite(value)) return toCents(INVITE_DAILY_CAP);
  return toCents(Math.max(0, value));
}

export function normalizeInviteCode(raw: string) {
  return raw.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
}

function utcDayStart(at: number) {
  const date = new Date(at);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function findUserByInviteCode(store: StoreData, raw: string) {
  const code = normalizeInviteCode(raw);
  if (code.length < 4) return null;
  const needle = code.toLowerCase();
  return (
    Object.values(store.users).find(
      (user) => user.inviteCode && user.inviteCode.toLowerCase() === needle,
    ) ?? null
  );
}

function newInviteCode(store: StoreData) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let code = "";
    const bytes = randomBytes(8);
    for (const byte of bytes) {
      code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      if (code.length === 8) break;
    }
    if (!findUserByInviteCode(store, code)) return code;
  }
  return randomBytes(6).toString("hex").slice(0, 8);
}

export function ensureInviteCode(store: StoreData, user: User) {
  if (isHouseUser(user)) {
    user.inviteCode = user.inviteCode || "";
    user.invitedBy = user.invitedBy ?? null;
    return user.inviteCode;
  }
  user.invitedBy = user.invitedBy ?? null;
  if (normalizeInviteCode(user.inviteCode || "").length >= 4) {
    return user.inviteCode;
  }
  user.inviteCode = newInviteCode(store);
  return user.inviteCode;
}

export function applyInviteOnSignup(store: StoreData, user: User, rawCode: string) {
  if (user.invitedBy || isHouseUser(user)) return null;
  const inviter = findUserByInviteCode(store, rawCode);
  if (!inviter || inviter.id === user.id || isHouseUser(inviter)) return null;
  user.invitedBy = inviter.id;
  return inviter;
}

export async function warmInviteTotals() {
  const day = utcDayStart(Date.now());
  const today = await prisma.$queryRaw<{ playerId: string; total: number }[]>`
    SELECT playerId, COALESCE(SUM(amount), 0) as total FROM Tx
    WHERE type = 'invite' AND createdAt >= ${day} GROUP BY playerId
  `;
  const life = await prisma.$queryRaw<{ playerId: string; total: number }[]>`
    SELECT playerId, COALESCE(SUM(amount), 0) as total FROM Tx
    WHERE type = 'invite' GROUP BY playerId
  `;
  inviteToday.clear();
  inviteLife.clear();
  for (const row of today) {
    inviteToday.set(row.playerId, { day, cents: Math.round(Number(row.total)) });
  }
  for (const row of life) {
    inviteLife.set(row.playerId, Math.round(Number(row.total)));
  }
}

export async function hadClickTx(store: StoreData, userId: string) {
  if (store.txs.some((tx) => tx.playerId === userId && tx.type === "click")) {
    return true;
  }
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM Tx WHERE playerId = ${userId} AND type = 'click' LIMIT 1
  `;
  return rows.length > 0;
}

export function nudgeFirstClickInvite(store: StoreData, userId: string) {
  if (inviteEarnedCents(store, userId) > 0) return;
  if (
    store.notifications.some(
      (item) => item.userId === userId && item.title === FIRST_CLICK_INVITE_TITLE,
    )
  ) {
    return;
  }
  notify(store, userId, {
    kind: "system",
    title: FIRST_CLICK_INVITE_TITLE,
    body: `Copy invite on a take or Account. Classic sits ${classicHourClock(classicHourUtc())}. Night sits ${nightHourClock(nightHourUtc())}.`,
    href: "/account",
  });
}

export function inviteTxsFor(store: StoreData, userId: string) {
  return store.txs.filter((tx) => tx.playerId === userId && tx.type === "invite");
}

export function inviteEarnedCents(store: StoreData, userId: string, since = 0) {
  if (since <= 0 && inviteLife.has(userId)) return inviteLife.get(userId) ?? 0;
  if (since > 0) return inviteEarnedTodayCents(store, userId, since);
  return inviteTxsFor(store, userId).reduce((sum, tx) => {
    if (tx.createdAt < since) return sum;
    return sum + tx.amount;
  }, 0);
}

export function inviteEarnedTodayCents(store: StoreData, userId: string, at = Date.now()) {
  const day = utcDayStart(at);
  const hit = inviteToday.get(userId);
  if (hit && hit.day === day) return hit.cents;
  return inviteTxsFor(store, userId).reduce((sum, tx) => {
    if (tx.createdAt < day) return sum;
    return sum + tx.amount;
  }, 0);
}

function addInviteTx(store: StoreData, playerId: string, amount: number, note: string, at: number) {
  const tx: Tx = {
    id: crypto.randomUUID(),
    playerId,
    type: "invite",
    amount,
    createdAt: at,
    note,
  };
  store.txs.unshift(tx);
  store.txs = store.txs.slice(0, 400);
  const day = utcDayStart(at);
  const hit = inviteToday.get(playerId);
  if (!hit || hit.day !== day) inviteToday.set(playerId, { day, cents: amount });
  else hit.cents += amount;
  inviteLife.set(playerId, (inviteLife.get(playerId) ?? 0) + amount);
}

function losingClicksFor(
  clicks: Record<ColorId, number> | undefined,
  losingColors: ColorId[],
) {
  if (!clicks) return 0;
  return losingColors.reduce((sum, id) => sum + (clicks[id] ?? 0), 0);
}

export function payInviteRake(
  store: StoreData,
  roomName: string,
  roundNumber: number,
  rake: number,
  losingClicks: number,
  losingColors: ColorId[],
  clicks: Record<string, Record<ColorId, number>>,
  at: number,
) {
  if (rake <= 0 || losingClicks <= 0) return 0;
  const shareBps = inviteRakeShareBps();
  if (shareBps <= 0) return 0;
  const cap = inviteDailyCapCents();
  let paid = 0;

  for (const [playerId, playerClicks] of Object.entries(clicks)) {
    const player = store.users[playerId];
    if (!player?.invitedBy) continue;
    const inviter = store.users[player.invitedBy];
    if (!inviter || inviter.id === player.id || isHouseUser(inviter) || isHouseUser(player)) {
      continue;
    }
    const playerLosing = losingClicksFor(playerClicks, losingColors);
    if (playerLosing <= 0) continue;
    const already = inviteEarnedTodayCents(store, inviter.id, at);
    const cut = inviteCutCents(rake, playerLosing, losingClicks, shareBps, already, cap);
    if (cut <= 0) continue;
    inviter.balance += cut;
    addInviteTx(
      store,
      inviter.id,
      cut,
      `Invite · ${formatCents(cut)} USDT from @${player.username} · ${roomName} #${roundNumber}`,
      at,
    );
    notify(store, inviter.id, {
      kind: "system",
      title: "Invite credit",
      body: `${formatCents(cut)} USDT house-rake share from @${player.username}.`,
      href: "/account",
    });
    if (inviter.email) {
      const mail = inviteCreditMail({
        username: inviter.username,
        cents: cut,
        from: player.username,
        room: roomName,
      });
      queueEmail({
        userId: inviter.id,
        to: inviter.email,
        kind: "invite",
        ...mail,
      });
    }
    paid += cut;
  }

  return paid;
}
