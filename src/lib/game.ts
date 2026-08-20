import {
  COLORS,
  colorById,
  emptyColorCounts,
  type ColorId,
} from "./colors";
import { CLICK_PRICE, REVEAL_SECONDS, ROUND_SECONDS } from "./config";
import { toPublicUser } from "./auth";
import { notify } from "./notifications";
import { ensureUserWallets } from "./wallets";
import type {
  GameState,
  PlayerClicks,
  PublicRound,
  Round,
  RoundResult,
  StoreData,
  Tx,
} from "./types";

function nowMs() {
  return Date.now();
}

function emptyClicks(): PlayerClicks {
  return emptyColorCounts();
}

function newRound(number: number, at: number): Round {
  return {
    id: crypto.randomUUID(),
    number,
    status: "live",
    startedAt: at,
    endsAt: at + ROUND_SECONDS * 1000,
    revealUntil: null,
    clickPrice: CLICK_PRICE,
    totals: emptyColorCounts(),
    clicks: {},
    result: null,
  };
}

function addTx(
  store: StoreData,
  playerId: string,
  type: Tx["type"],
  amount: number,
  note: string,
) {
  store.txs.unshift({
    id: crypto.randomUUID(),
    playerId,
    type,
    amount,
    createdAt: nowMs(),
    note,
  });
  store.txs = store.txs.slice(0, 400);
}

function playerClicksOn(round: Round, playerId: string): PlayerClicks {
  return { ...emptyClicks(), ...round.clicks[playerId] };
}

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

function settleRound(store: StoreData, round: Round, at: number) {
  const totals = round.totals;
  const max = Math.max(...COLORS.map((color) => totals[color.id]));
  const totalClicks = COLORS.reduce((sum, color) => sum + totals[color.id], 0);

  if (totalClicks === 0 || max === 0) {
    round.status = "revealing";
    round.revealUntil = at + REVEAL_SECONDS * 1000;
    round.result = {
      roundId: round.id,
      kind: "empty",
      winners: [],
      totals: { ...totals },
      losingPot: 0,
      winningClicks: 0,
      payoutPerWinningClick: 0,
      payouts: [],
    };
    return;
  }

  const winners = COLORS.filter((color) => totals[color.id] === max).map(
    (color) => color.id,
  );
  const losingColors = COLORS.filter((color) => totals[color.id] < max).map(
    (color) => color.id,
  );

  if (losingColors.length === 0) {
    const refunds: RoundResult["payouts"] = [];
    for (const [playerId, clicks] of Object.entries(round.clicks)) {
      const clickCount = COLORS.reduce(
        (sum, color) => sum + (clicks[color.id] ?? 0),
        0,
      );
      if (clickCount <= 0) continue;
      const amount = clickCount * round.clickPrice;
      const user = store.users[playerId];
      if (user) user.balance = roundToCents(user.balance + amount);
      addTx(store, playerId, "refund", amount, `Round #${round.number} push`);
      notify(store, playerId, {
        kind: "refund",
        title: `Round #${round.number} push`,
        body: `Colors tied. ${amount.toFixed(2)} USDT was returned.`,
        href: "/",
      });
      refunds.push({ playerId, amount, winningClicks: clickCount });
    }
    round.status = "revealing";
    round.revealUntil = at + REVEAL_SECONDS * 1000;
    round.result = {
      roundId: round.id,
      kind: "push",
      winners,
      totals: { ...totals },
      losingPot: 0,
      winningClicks: totalClicks,
      payoutPerWinningClick: round.clickPrice,
      payouts: refunds,
    };
    return;
  }

  const winningClicks = winners.reduce((sum, id) => sum + totals[id], 0);
  const losingClicks = losingColors.reduce((sum, id) => sum + totals[id], 0);
  const losingPot = losingClicks * round.clickPrice;
  const payoutPerWinningClick = round.clickPrice + losingPot / winningClicks;

  const payouts: RoundResult["payouts"] = [];
  for (const [playerId, clicks] of Object.entries(round.clicks)) {
    const winClicks = winners.reduce((sum, id) => sum + (clicks[id] ?? 0), 0);
    if (winClicks <= 0) continue;
    const amount = roundToCents(winClicks * payoutPerWinningClick);
    const user = store.users[playerId];
    if (user) user.balance = roundToCents(user.balance + amount);
    const names = winners.map((id) => colorById(id).name).join(" & ");
    addTx(
      store,
      playerId,
      "payout",
      amount,
      `Round #${round.number} ${names} take`,
    );
    notify(store, playerId, {
      kind: "payout",
      title: `Round #${round.number} payout`,
      body: `${names} took the pot. You received ${amount.toFixed(2)} USDT.`,
      href: "/",
    });
    payouts.push({ playerId, amount, winningClicks: winClicks });
  }

  const paid = new Set(payouts.map((item) => item.playerId));
  for (const playerId of Object.keys(round.clicks)) {
    if (paid.has(playerId)) continue;
    notify(store, playerId, {
      kind: "system",
      title: `Round #${round.number} settled`,
      body: "Your color did not have the most clicks.",
      href: "/",
    });
  }

  round.status = "revealing";
  round.revealUntil = at + REVEAL_SECONDS * 1000;
  round.result = {
    roundId: round.id,
    kind: "take",
    winners,
    totals: { ...totals },
    losingPot,
    winningClicks,
    payoutPerWinningClick: roundToCents(payoutPerWinningClick),
    payouts,
  };
}

function tickRound(store: StoreData) {
  const at = nowMs();
  if (!store.round) {
    store.roundNumber += 1;
    store.round = newRound(store.roundNumber, at);
    return;
  }

  const round = store.round;
  if (round.status === "live" && at >= round.endsAt) {
    settleRound(store, round, at);
    return;
  }

  if (
    round.status === "revealing" &&
    round.revealUntil != null &&
    at >= round.revealUntil
  ) {
    store.roundNumber += 1;
    store.round = newRound(store.roundNumber, at);
  }
}

function toPublicRound(round: Round, playerId: string): PublicRound {
  const totalClicks = COLORS.reduce(
    (sum, color) => sum + round.totals[color.id],
    0,
  );
  return {
    id: round.id,
    number: round.number,
    status: round.status,
    startedAt: round.startedAt,
    endsAt: round.endsAt,
    revealUntil: round.revealUntil,
    clickPrice: round.clickPrice,
    totals: { ...round.totals },
    yourClicks: playerClicksOn(round, playerId),
    totalClicks,
    pot: roundToCents(totalClicks * round.clickPrice),
    result: round.result,
  };
}

export function getGameState(
  store: StoreData,
  userId: string | null,
): GameState {
  tickRound(store);
  const round = store.round!;
  if (!userId || !store.users[userId]) {
    return {
      now: nowMs(),
      user: null,
      round: toPublicRound(round, ""),
    };
  }
  const user = store.users[userId];
  ensureUserWallets(user);
  const txs = store.txs.filter((tx) => tx.playerId === userId).slice(0, 30);
  return {
    now: nowMs(),
    user: toPublicUser(user, txs, store),
    round: toPublicRound(round, userId),
  };
}

export function clickColor(
  store: StoreData,
  userId: string,
  colorId: ColorId,
): GameState {
  getGameState(store, userId);
  const round = store.round!;
  const user = store.users[userId];
  if (!user) throw new Error("Sign in to continue.");

  if (round.status !== "live") {
    throw new Error("Round is locked while the winner is shown.");
  }
  if (nowMs() >= round.endsAt) {
    tickRound(store);
    throw new Error("That round just ended.");
  }
  if (user.balance < round.clickPrice) {
    throw new Error("Not enough balance. Invest first.");
  }

  user.balance = roundToCents(user.balance - round.clickPrice);
  round.totals[colorId] += 1;
  const current = playerClicksOn(round, userId);
  current[colorId] += 1;
  round.clicks[userId] = current;
  addTx(
    store,
    userId,
    "click",
    round.clickPrice,
    `Clicked ${colorById(colorId).name} in round #${round.number}`,
  );
  return getGameState(store, userId);
}
