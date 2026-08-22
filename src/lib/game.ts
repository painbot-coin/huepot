import {
  colorById,
  emptyColorCounts,
  type ColorId,
} from "./colors";
import { REVEAL_SECONDS } from "./config";
import { toPublicUser } from "./auth";
import { notify } from "./notifications";
import {
  BASIC_ROOMS,
  buttonIdsForCount,
  createCustomRoom,
  ensureRooms,
  findRoom,
  isLiveFog,
  parseChat,
  postRoomEvent,
} from "./rooms";
import { ensureUserWallets } from "./wallets";
import type {
  GameState,
  LobbyState,
  PlayerClicks,
  PublicRoom,
  PublicRoomCard,
  PublicRound,
  PublicSeat,
  Room,
  Round,
  RoundResult,
  SearchHit,
  StoreData,
  Tx,
} from "./types";

function nowMs() {
  return Date.now();
}

function emptyClicks(): PlayerClicks {
  return emptyColorCounts();
}

function newRound(room: Room, number: number, at: number): Round {
  const buttonIds = buttonIdsForCount(room.buttonCount);
  return {
    id: crypto.randomUUID(),
    number,
    status: "live",
    startedAt: at,
    endsAt: at + room.roundSeconds * 1000,
    revealUntil: null,
    clickPrice: room.clickPrice,
    buttonIds,
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

function roomHref(room: Room) {
  return `/rooms/${room.slug}`;
}

function roomButtons(round: Round) {
  return round.buttonIds.map((id) => colorById(id));
}

function settleRound(store: StoreData, room: Room, round: Round, at: number) {
  const buttons = roomButtons(round);
  const totals = round.totals;
  const max = Math.max(...buttons.map((color) => totals[color.id]));
  const totalClicks = buttons.reduce((sum, color) => sum + totals[color.id], 0);
  const href = roomHref(room);

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
    postRoomEvent(room, {
      kind: "round",
      body: `Round #${round.number} had no clicks. The table stays empty.`,
    });
    return;
  }

  const winners = buttons
    .filter((color) => totals[color.id] === max)
    .map((color) => color.id);
  const losingColors = buttons
    .filter((color) => totals[color.id] < max)
    .map((color) => color.id);

  if (losingColors.length === 0) {
    const refunds: RoundResult["payouts"] = [];
    for (const [playerId, clicks] of Object.entries(round.clicks)) {
      const clickCount = buttons.reduce(
        (sum, color) => sum + (clicks[color.id] ?? 0),
        0,
      );
      if (clickCount <= 0) continue;
      const amount = clickCount * round.clickPrice;
      const user = store.users[playerId];
      if (user) user.balance = roundToCents(user.balance + amount);
      addTx(store, playerId, "refund", amount, `${room.name} round #${round.number} push`);
      notify(store, playerId, {
        kind: "refund",
        title: `${room.name} · round #${round.number} push`,
        body: `Colors tied. ${amount.toFixed(2)} USDT was returned.`,
        href,
      });
      postRoomEvent(room, {
        kind: "refund",
        userId: playerId,
        username: user?.username ?? null,
        body: `${user?.username ?? "A player"} got ${amount.toFixed(2)} USDT back on the tie.`,
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
    postRoomEvent(room, {
      kind: "round",
      body: `Round #${round.number} tied. All clicks were refunded.`,
    });
    return;
  }

  const winningClicks = winners.reduce((sum, id) => sum + totals[id], 0);
  const losingClicks = losingColors.reduce((sum, id) => sum + totals[id], 0);
  const losingPot = losingClicks * round.clickPrice;
  const payoutPerWinningClick = round.clickPrice + losingPot / winningClicks;
  const names = winners.map((id) => colorById(id).name).join(" & ");

  const payouts: RoundResult["payouts"] = [];
  for (const [playerId, clicks] of Object.entries(round.clicks)) {
    const winClicks = winners.reduce((sum, id) => sum + (clicks[id] ?? 0), 0);
    if (winClicks <= 0) continue;
    const amount = roundToCents(winClicks * payoutPerWinningClick);
    const user = store.users[playerId];
    if (user) user.balance = roundToCents(user.balance + amount);
    addTx(
      store,
      playerId,
      "payout",
      amount,
      `${room.name} round #${round.number} ${names} take`,
    );
    notify(store, playerId, {
      kind: "payout",
      title: `${room.name} · wager earned`,
      body: `${names} took the pot. You received ${amount.toFixed(2)} USDT.`,
      href,
    });
    postRoomEvent(room, {
      kind: "payout",
      userId: playerId,
      username: user?.username ?? null,
      body: `${user?.username ?? "A player"} earned ${amount.toFixed(2)} USDT on ${names}.`,
    });
    payouts.push({ playerId, amount, winningClicks: winClicks });
  }

  const paid = new Set(payouts.map((item) => item.playerId));
  for (const playerId of Object.keys(round.clicks)) {
    if (paid.has(playerId)) continue;
    const user = store.users[playerId];
    notify(store, playerId, {
      kind: "system",
      title: `${room.name} · round #${round.number} settled`,
      body: "Your color did not have the most clicks.",
      href,
    });
    postRoomEvent(room, {
      kind: "system",
      userId: playerId,
      username: user?.username ?? null,
      body: `${user?.username ?? "A player"} missed the take.`,
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
  postRoomEvent(room, {
    kind: "round",
    body: `Round #${round.number}: ${names} took ${roundToCents(losingPot + winningClicks * round.clickPrice).toFixed(2)} USDT.`,
  });
}

function tickRoom(store: StoreData, room: Room) {
  const at = nowMs();
  if (!room.round) {
    room.roundNumber += 1;
    room.round = newRound(room, room.roundNumber, at);
    postRoomEvent(room, {
      kind: "round",
      body: `Round #${room.roundNumber} is live.`,
    });
    return;
  }

  const round = room.round;
  if (round.status === "live" && at >= round.endsAt) {
    settleRound(store, room, round, at);
    return;
  }

  if (
    round.status === "revealing" &&
    round.revealUntil != null &&
    at >= round.revealUntil
  ) {
    room.roundNumber += 1;
    room.round = newRound(room, room.roundNumber, at);
    postRoomEvent(room, {
      kind: "round",
      body: `Round #${room.roundNumber} is live.`,
    });
  }
}

function toPublicRound(room: Room, round: Round, playerId: string): PublicRound {
  const fog = isLiveFog(room, round);
  const totalClicks = round.buttonIds.reduce(
    (sum, id) => sum + round.totals[id],
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
    buttonIds: [...round.buttonIds],
    totals: fog ? emptyColorCounts() : { ...round.totals },
    yourClicks: playerClicksOn(round, playerId),
    totalClicks,
    pot: roundToCents(totalClicks * round.clickPrice),
    result: round.result,
    fog,
  };
}

function toPublicRoomCard(store: StoreData, room: Room): PublicRoomCard {
  const round = room.round;
  const totalClicks = round
    ? round.buttonIds.reduce((sum, id) => sum + round.totals[id], 0)
    : 0;
  const owner = room.ownerId ? store.users[room.ownerId] : null;
  return {
    slug: room.slug,
    name: room.name,
    kind: room.kind,
    ownerName: owner?.username ?? null,
    buttonCount: room.buttonCount,
    clickPrice: room.clickPrice,
    roundSeconds: room.roundSeconds,
    fogSeconds: room.fogSeconds ?? null,
    status: round?.status ?? "live",
    pot: roundToCents(totalClicks * room.clickPrice),
    players: room.playerIds.length,
    roundNumber: room.roundNumber,
    liveMinutes: room.liveMinutes ?? null,
    closesAt: room.closesAt ?? null,
  };
}

function toPublicRoom(store: StoreData, room: Room): PublicRoom {
  return { ...toPublicRoomCard(store, room), id: room.id };
}

function estimateSeat(round: Round, clicks: PlayerClicks, colorId: ColorId) {
  const colorClicks = round.totals[colorId];
  const yours = clicks[colorId] ?? 0;
  if (colorClicks <= 0 || yours <= 0) return 0;
  const losingClicks = round.buttonIds.reduce((sum, id) => sum + round.totals[id], 0) - colorClicks;
  const losingPot = losingClicks * round.clickPrice;
  return yours * round.clickPrice + (yours / colorClicks) * losingPot;
}

function toSeats(store: StoreData, room: Room, viewerId: string | null): PublicSeat[] {
  const round = room.round;
  if (!round) return [];
  const fog = isLiveFog(room, round);
  const ids = new Set([...room.playerIds, ...Object.keys(round.clicks)]);
  const seats: PublicSeat[] = [];
  for (const userId of ids) {
    const user = store.users[userId];
    if (!user) continue;
    const clicks = playerClicksOn(round, userId);
    const totalClicks = round.buttonIds.reduce((sum, id) => sum + (clicks[id] ?? 0), 0);
    const estimated = round.buttonIds.reduce(
      (sum, id) => sum + estimateSeat(round, clicks, id),
      0,
    );
    const you = userId === viewerId;
    const hide = fog && !you;
    seats.push({
      userId,
      username: user.username,
      you,
      balance: user.balance,
      totalClicks: hide ? 0 : totalClicks,
      spent: hide ? 0 : roundToCents(totalClicks * round.clickPrice),
      clicks: hide ? emptyClicks() : clicks,
      estimated: hide ? 0 : roundToCents(estimated),
    });
  }
  seats.sort((a, b) => b.totalClicks - a.totalClicks || b.spent - a.spent || a.username.localeCompare(b.username));
  return seats;
}

function listRoomCards(store: StoreData): PublicRoomCard[] {
  return Object.values(store.rooms)
    .map((room) => toPublicRoomCard(store, room))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "basic" ? -1 : 1;
      const order = BASIC_ROOMS.map((item) => item.slug);
      return order.indexOf(a.slug) - order.indexOf(b.slug) || a.name.localeCompare(b.name);
    });
}

function pruneExpiredRooms(store: StoreData) {
  const at = nowMs();
  for (const [slug, room] of Object.entries(store.rooms)) {
    if (room.kind !== "custom" || !room.closesAt || at < room.closesAt) continue;
    if (room.round?.status === "live") {
      settleRound(store, room, room.round, at);
    }
    for (const playerId of room.playerIds) {
      notify(store, playerId, {
        kind: "system",
        title: `${room.name} closed`,
        body: "This table’s live time ended and the room was deleted.",
        href: "/",
      });
    }
    delete store.rooms[slug];
  }
}

function publicUserFor(store: StoreData, userId: string | null) {
  if (!userId || !store.users[userId]) return null;
  const user = store.users[userId];
  ensureUserWallets(user);
  const txs = store.txs.filter((tx) => tx.playerId === userId).slice(0, 30);
  return toPublicUser(user, txs, store);
}

export function getLobbyState(store: StoreData, userId: string | null): LobbyState {
  ensureRooms(store);
  for (const room of Object.values(store.rooms)) tickRoom(store, room);
  pruneExpiredRooms(store);
  ensureRooms(store);
  return {
    now: nowMs(),
    user: publicUserFor(store, userId),
    rooms: listRoomCards(store),
  };
}

export function getRoomState(
  store: StoreData,
  slug: string,
  userId: string | null,
): GameState {
  ensureRooms(store);
  for (const room of Object.values(store.rooms)) tickRoom(store, room);
  pruneExpiredRooms(store);
  ensureRooms(store);
  const room = findRoom(store, slug);
  tickRoom(store, room);
  const round = room.round!;
  return {
    now: nowMs(),
    user: publicUserFor(store, userId),
    room: toPublicRoom(store, room),
    round: toPublicRound(room, round, userId ?? ""),
    feed: room.events.slice(-80),
    rooms: listRoomCards(store),
    seats: toSeats(store, room, userId),
  };
}

export function getGameState(store: StoreData, userId: string | null): GameState {
  return getRoomState(store, "classic", userId);
}

export function clickColor(
  store: StoreData,
  userId: string,
  colorId: ColorId,
  slug = "classic",
): GameState {
  const room = findRoom(store, slug);
  tickRoom(store, room);
  const round = room.round!;
  const user = store.users[userId];
  if (!user) throw new Error("Sign in to continue.");

  if (!round.buttonIds.includes(colorId)) {
    throw new Error("That coin is not on this table.");
  }
  if (round.status !== "live") {
    throw new Error("Round is locked while the winner is shown.");
  }
  if (nowMs() >= round.endsAt) {
    tickRoom(store, room);
    throw new Error("That round just ended.");
  }
  if (user.balance < round.clickPrice) {
    throw new Error("Not enough balance. Invest first.");
  }

  const firstSit = !room.playerIds.includes(userId);
  user.balance = roundToCents(user.balance - round.clickPrice);
  round.totals[colorId] += 1;
  const current = playerClicksOn(round, userId);
  current[colorId] += 1;
  round.clicks[userId] = current;
  if (firstSit) room.playerIds.push(userId);
  addTx(
    store,
    userId,
    "click",
    round.clickPrice,
    `Clicked ${colorById(colorId).name} in ${room.name} #${round.number}`,
  );
  if (firstSit) {
    postRoomEvent(room, {
      kind: "join",
      userId,
      username: user.username,
      body: `${user.username} sat at the table.`,
    });
  }
  return getRoomState(store, slug, userId);
}

export function postRoomChat(
  store: StoreData,
  slug: string,
  userId: string,
  raw: string,
): GameState {
  const room = findRoom(store, slug);
  tickRoom(store, room);
  const user = store.users[userId];
  if (!user) throw new Error("Sign in to chat.");
  const text = parseChat(raw);
  const recent = room.events.filter(
    (item) => item.kind === "chat" && item.userId === userId && nowMs() - item.createdAt < 900,
  );
  if (recent.length) throw new Error("Wait a moment before sending again.");
  if (!room.playerIds.includes(userId)) room.playerIds.push(userId);
  postRoomEvent(room, {
    kind: "chat",
    userId,
    username: user.username,
    body: text,
  });
  return getRoomState(store, slug, userId);
}

export function openCustomRoom(
  store: StoreData,
  userId: string,
  input: {
    name?: string;
    buttonCount?: number;
    clickPrice?: number;
    roundSeconds?: number;
    liveMinutes?: number;
    fog?: boolean;
    fogSeconds?: number | null;
  },
) {
  const room = createCustomRoom(store, userId, input);
  tickRoom(store, room);
  return getRoomState(store, room.slug, userId);
}

export function searchPit(store: StoreData, query: string): SearchHit {
  ensureRooms(store);
  pruneExpiredRooms(store);
  const q = query.trim().toLowerCase();
  if (q.length < 1) return { rooms: listRoomCards(store).slice(0, 8), users: [] };
  const rooms = listRoomCards(store).filter(
    (room) =>
      room.name.toLowerCase().includes(q) ||
      room.slug.toLowerCase().includes(q) ||
      (room.ownerName ?? "").toLowerCase().includes(q),
  );
  const users = Object.values(store.users)
    .filter((user) => user.username.toLowerCase().includes(q))
    .slice(0, 12)
    .map((user) => ({
      username: user.username,
      rooms: Object.values(store.rooms)
        .filter((room) => room.playerIds.includes(user.id))
        .map((room) => ({ slug: room.slug, name: room.name })),
    }));
  return { rooms: rooms.slice(0, 12), users };
}
