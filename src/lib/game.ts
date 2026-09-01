import {
  colorById,
  emptyColorCounts,
  type ColorId,
} from "./colors";
import { MAX_ROOM_NAME, REVEAL_SECONDS } from "./config";
import { toPublicUser } from "./public-user";
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
import { ensureRoundSeed } from "./fairness";
import { queueSettledRound } from "./fairness-db";
import { assertCanPlay, notePlayTx } from "./limits";
import { HOUSE_USER_ID, ensureHouseUser, isHouseUser, rakeBps, rakeFromPot, rakePercentLabel } from "./house";
import { payInviteRake, ensureInviteCode } from "./referrals";
import {
  floorPayoutPerClick,
  formatCents,
  fromCents,
  splitCentsByClicks,
} from "./money";
import { ensureUserWallets } from "./wallets";
import { classicHourAt } from "./classic-hour";
import { fogCupAt } from "./fog-cup";
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
  const round: Round = {
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
    seedCommit: "",
    serverSeed: "",
    fairHash: "",
  };
  ensureRoundSeed(round);
  return round;
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
  notePlayTx(playerId, type, amount);
}

function playerClicksOn(round: Round, playerId: string): PlayerClicks {
  return { ...emptyClicks(), ...round.clicks[playerId] };
}

function publicMoney(result: RoundResult | null): RoundResult | null {
  if (!result) return null;
  return {
    ...result,
    losingPot: fromCents(result.losingPot),
    payoutPerWinningClick: fromCents(result.payoutPerWinningClick),
    rake: fromCents(result.rake ?? 0),
    payouts: result.payouts.map((item) => ({
      ...item,
      amount: fromCents(item.amount),
    })),
  };
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
      rake: 0,
      payouts: [],
    };
    queueSettledRound(room, round, at);
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
      if (user) user.balance += amount;
      addTx(store, playerId, "refund", amount, `${room.name} round #${round.number} push`);
      notify(store, playerId, {
        kind: "refund",
        title: `${room.name} · round #${round.number} push`,
        body: `Colors tied. ${formatCents(amount)} USDT was returned.`,
        href,
      });
      postRoomEvent(room, {
        kind: "refund",
        userId: playerId,
        username: user?.username ?? null,
        body: `${user?.username ?? "A player"} got ${formatCents(amount)} USDT back on the tie.`,
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
      rake: 0,
      payouts: refunds,
    };
    postRoomEvent(room, {
      kind: "round",
      body: `Round #${round.number} tied. All clicks were refunded.`,
    });
    queueSettledRound(room, round, at);
    return;
  }

  const winningClicks = winners.reduce((sum, id) => sum + totals[id], 0);
  const losingClicks = losingColors.reduce((sum, id) => sum + totals[id], 0);
  const losingPot = losingClicks * round.clickPrice;
  const rake = rakeFromPot(losingPot, rakeBps());
  const distributable = losingPot - rake;
  const payoutPerWinningClick = floorPayoutPerClick(
    round.clickPrice,
    distributable,
    winningClicks,
  );
  const names = winners.map((id) => colorById(id).name).join(" & ");
  const potShares = splitCentsByClicks(
    distributable,
    Object.entries(round.clicks).map(([playerId, clicks]) => ({
      id: playerId,
      clicks: winners.reduce((sum, id) => sum + (clicks[id] ?? 0), 0),
    })),
    winningClicks,
  );

  if (rake > 0) {
    const house = ensureHouseUser(store);
    const invited = payInviteRake(
      store,
      room.name,
      round.number,
      rake,
      losingClicks,
      losingColors,
      round.clicks,
      at,
    );
    const houseKeep = rake - invited;
    if (houseKeep > 0) {
      house.balance += houseKeep;
      addTx(
        store,
        house.id,
        "rake",
        houseKeep,
        `${room.name} round #${round.number} house take`,
      );
    }
  }

  const payouts: RoundResult["payouts"] = [];
  for (const [playerId, clicks] of Object.entries(round.clicks)) {
    const winClicks = winners.reduce((sum, id) => sum + (clicks[id] ?? 0), 0);
    if (winClicks <= 0) continue;
    const amount = winClicks * round.clickPrice + (potShares.get(playerId) ?? 0);
    const user = store.users[playerId];
    if (user) user.balance += amount;
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
      body: `${names} took the pot. You received ${formatCents(amount)} USDT.`,
      href,
    });
    postRoomEvent(room, {
      kind: "payout",
      userId: playerId,
      username: user?.username ?? null,
      body: `${user?.username ?? "A player"} earned ${formatCents(amount)} USDT on ${names}.`,
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
    payoutPerWinningClick,
    rake,
    payouts,
  };
  postRoomEvent(room, {
    kind: "round",
    body:
      rake > 0
        ? `Round #${round.number}: ${names} took ${formatCents(distributable + winningClicks * round.clickPrice)} USDT. House ${rakePercentLabel()} was ${formatCents(rake)} USDT.`
        : `Round #${round.number}: ${names} took ${formatCents(losingPot + winningClicks * round.clickPrice)} USDT.`,
  });
  queueSettledRound(room, round, at);
}

function pauseShift(room: Room, at = nowMs()) {
  if (!room.paused || !room.pausedAt) return 0;
  return Math.max(0, at - room.pausedAt);
}

function requireHost(room: Room, userId: string) {
  if (room.kind !== "custom" || room.ownerId !== userId) {
    throw new Error("Only the host can do that.");
  }
}

function tickRoom(store: StoreData, room: Room) {
  if (room.paused) return;
  const at = nowMs();
  if (!room.round) {
    room.roundNumber += 1;
    room.round = newRound(room, room.roundNumber, at);
    return;
  }

  const round = room.round;
  ensureRoundSeed(round);
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
  }
}

export function roomDueForTick(room: Room | undefined, at = Date.now()) {
  if (!room) return true;
  if (room.paused) return false;
  if (!room.round) return true;
  if (!room.round.seedCommit) return true;
  if (room.round.status === "live" && at >= room.round.endsAt) return true;
  if (
    room.round.status === "revealing" &&
    room.round.revealUntil != null &&
    at >= room.round.revealUntil
  ) {
    return true;
  }
  if (room.kind === "custom" && room.closesAt && at >= room.closesAt) return true;
  return false;
}

function toPublicRound(round: Round, playerId: string, room?: Room): PublicRound {
  const totalClicks = round.buttonIds.reduce(
    (sum, id) => sum + round.totals[id],
    0,
  );
  const shift = room ? pauseShift(room) : 0;
  const fog = Boolean(room && isLiveFog(room, round, nowMs() - shift));
  return {
    id: round.id,
    number: round.number,
    status: round.status,
    startedAt: round.startedAt + shift,
    endsAt: round.endsAt + shift,
    revealUntil: round.revealUntil != null ? round.revealUntil + shift : null,
    clickPrice: fromCents(round.clickPrice),
    buttonIds: [...round.buttonIds],
    totals: fog ? emptyColorCounts() : { ...round.totals },
    yourClicks: playerClicksOn(round, playerId),
    totalClicks,
    pot: fromCents(totalClicks * round.clickPrice),
    result: publicMoney(round.result),
    seedCommit: round.seedCommit,
    serverSeed: round.status === "revealing" ? round.serverSeed : null,
    fairHash: round.status === "revealing" ? round.fairHash || null : null,
    rakeBps: rakeBps(),
    fog,
  };
}

function sittingNames(store: StoreData, room: Room) {
  if (room.round && isLiveFog(room, room.round, nowMs() - pauseShift(room))) return [];
  const names: string[] = [];
  for (const id of room.playerIds) {
    const user = store.users[id];
    if (!user || isHouseUser(user)) continue;
    names.push(user.username);
    if (names.length >= 4) break;
  }
  return names;
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
    clickPrice: fromCents(room.clickPrice),
    roundSeconds: room.roundSeconds,
    fogSeconds: room.fogSeconds ?? null,
    status: round?.status ?? "live",
    pot: fromCents(totalClicks * room.clickPrice),
    players: room.playerIds.length,
    roundNumber: room.roundNumber,
    liveMinutes: room.liveMinutes ?? null,
    closesAt: room.closesAt ? room.closesAt + pauseShift(room) : null,
    paused: Boolean(room.paused),
    sitting: sittingNames(store, room),
  };
}

function toPublicRoom(store: StoreData, room: Room, userId: string | null): PublicRoom {
  return {
    ...toPublicRoomCard(store, room),
    id: room.id,
    host: Boolean(userId && room.ownerId === userId),
    muted: Boolean(userId && (room.mutedIds ?? []).includes(userId)),
    slowMode: Boolean(room.slowMode),
  };
}

function estimateSeat(round: Round, clicks: PlayerClicks, colorId: ColorId) {
  const colorClicks = round.totals[colorId];
  const yours = clicks[colorId] ?? 0;
  if (colorClicks <= 0 || yours <= 0) return 0;
  const losingClicks = round.buttonIds.reduce((sum, id) => sum + round.totals[id], 0) - colorClicks;
  const losingPot = losingClicks * round.clickPrice;
  const distributable = losingPot - rakeFromPot(losingPot, rakeBps());
  return yours * round.clickPrice + (yours / colorClicks) * distributable;
}

function toSeats(store: StoreData, room: Room, viewerId: string | null): PublicSeat[] {
  const round = room.round;
  if (!round) return [];
  const fog = isLiveFog(room, round, nowMs() - pauseShift(room));
  const ids = new Set([...room.playerIds, ...Object.keys(round.clicks)]);
  const seats: PublicSeat[] = [];
  for (const userId of ids) {
    const user = store.users[userId];
    if (!user || user.id === HOUSE_USER_ID) continue;
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
      balance: you ? fromCents(user.balance) : 0,
      totalClicks: hide ? 0 : totalClicks,
      spent: hide ? 0 : fromCents(totalClicks * round.clickPrice),
      clicks: hide ? emptyClicks() : clicks,
      estimated: hide ? 0 : fromCents(Math.round(estimated)),
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
    if (room.paused) continue;
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
  ensureInviteCode(store, user);
  const txs = store.txs.filter((tx) => tx.playerId === userId).slice(0, 100);
  return toPublicUser(user, txs, store);
}

export function getLobbyState(store: StoreData, userId: string | null): LobbyState {
  ensureHouseUser(store);
  ensureRooms(store);
  for (const room of Object.values(store.rooms)) tickRoom(store, room);
  pruneExpiredRooms(store);
  ensureRooms(store);
  return {
    now: nowMs(),
    user: publicUserFor(store, userId),
    rooms: listRoomCards(store),
    classicHour: classicHourAt(),
    fogCup: fogCupAt(),
  };
}

export function getRoomState(
  store: StoreData,
  slug: string,
  userId: string | null,
): GameState {
  ensureHouseUser(store);
  ensureRooms(store);
  pruneExpiredRooms(store);
  ensureRooms(store);
  const room = findRoom(store, slug);
  tickRoom(store, room);
  const round = room.round!;
  return {
    now: nowMs(),
    user: publicUserFor(store, userId),
    round: toPublicRound(round, userId ?? "", room),
    room: toPublicRoom(store, room, userId),
    feed: room.events.slice(-80),
    rooms: listRoomCards(store),
    seats: toSeats(store, room, userId),
    classicHour: classicHourAt(),
    fogCup: fogCupAt(),
  };
}

export function snapshotRoomState(
  store: StoreData,
  slug: string,
  userId: string | null,
): GameState {
  const room = findRoom(store, slug);
  if (!room.round) {
    const error = new Error("That room is not open.");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  return {
    now: nowMs(),
    user: publicUserFor(store, userId),
    round: toPublicRound(room.round, userId ?? "", room),
    room: toPublicRoom(store, room, userId),
    feed: room.events.slice(-80),
    rooms: listRoomCards(store),
    seats: toSeats(store, room, userId),
    classicHour: classicHourAt(),
    fogCup: fogCupAt(),
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
  if (user.id === HOUSE_USER_ID) throw new Error("The house bank cannot play.");
  assertCanPlay(store, user, round.clickPrice);

  if (!round.buttonIds.includes(colorId)) {
    throw new Error("That coin is not on this table.");
  }
  if (room.paused) {
    throw new Error("The host paused this table.");
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
  assertCanPlay(store, user, round.clickPrice);

  const firstSit = !room.playerIds.includes(userId);
  user.balance -= round.clickPrice;
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
  if ((room.mutedIds ?? []).includes(userId)) {
    throw new Error("The host muted you in this room.");
  }
  const text = parseChat(raw);
  const gap = room.slowMode ? 4000 : 900;
  const recent = room.events.filter(
    (item) => item.kind === "chat" && item.userId === userId && nowMs() - item.createdAt < gap,
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
  const user = store.users[userId];
  if (!user) throw new Error("Sign in to continue.");
  assertCanPlay(store, user);
  const room = createCustomRoom(store, userId, input);
  tickRoom(store, room);
  return getRoomState(store, room.slug, userId);
}

export function staffKillRound(store: StoreData, slug: string) {
  const room = findRoom(store, slug);
  const round = room.round;
  if (!round || round.status !== "live") {
    throw new Error("No live round to void.");
  }
  const at = nowMs();
  const buttons = roomButtons(round);
  const refunds: RoundResult["payouts"] = [];
  for (const [playerId, clicks] of Object.entries(round.clicks)) {
    const clickCount = buttons.reduce((sum, color) => sum + (clicks[color.id] ?? 0), 0);
    if (clickCount <= 0) continue;
    const amount = clickCount * round.clickPrice;
    const user = store.users[playerId];
    if (user) user.balance += amount;
    addTx(store, playerId, "refund", amount, `${room.name} round #${round.number} voided`);
    notify(store, playerId, {
      kind: "refund",
      title: `${room.name} · round voided`,
      body: `Staff ended the round. ${formatCents(amount)} USDT came back.`,
      href: roomHref(room),
    });
    refunds.push({ playerId, amount, winningClicks: clickCount });
  }
  const totalClicks = buttons.reduce((sum, color) => sum + round.totals[color.id], 0);
  round.status = "revealing";
  round.revealUntil = at + REVEAL_SECONDS * 1000;
  round.result = {
    roundId: round.id,
    kind: "void",
    winners: [],
    totals: { ...round.totals },
    losingPot: 0,
    winningClicks: totalClicks,
    payoutPerWinningClick: round.clickPrice,
    rake: 0,
    payouts: refunds,
  };
  postRoomEvent(room, {
    kind: "round",
    body: `Round #${round.number} was voided by staff. Clicks were refunded.`,
  });
  queueSettledRound(room, round, at);
  return getRoomState(store, slug, null);
}

export function hostRenameRoom(store: StoreData, slug: string, userId: string, raw: string) {
  const room = findRoom(store, slug);
  requireHost(room, userId);
  const name = raw.trim().replace(/\s+/g, " ").slice(0, MAX_ROOM_NAME);
  if (name.length < 2) throw new Error("Give the table a short name.");
  if (name === room.name) return getRoomState(store, slug, userId);
  room.name = name;
  postRoomEvent(room, {
    kind: "system",
    body: `This table is now ${name}.`,
  });
  return getRoomState(store, slug, userId);
}

export function hostSetPaused(store: StoreData, slug: string, userId: string, paused: boolean) {
  const room = findRoom(store, slug);
  requireHost(room, userId);
  const at = nowMs();
  if (paused === Boolean(room.paused)) return getRoomState(store, slug, userId);
  if (paused) {
    room.paused = true;
    room.pausedAt = at;
    postRoomEvent(room, { kind: "system", body: "The host paused the table." });
  } else {
    const shift = pauseShift(room, at);
    if (room.round) {
      room.round.startedAt += shift;
      room.round.endsAt += shift;
      if (room.round.revealUntil != null) room.round.revealUntil += shift;
    }
    if (room.closesAt) room.closesAt += shift;
    room.paused = false;
    room.pausedAt = null;
    postRoomEvent(room, { kind: "system", body: "The host opened the table again." });
  }
  return getRoomState(store, slug, userId);
}

export function hostSetSlowMode(store: StoreData, slug: string, userId: string, slow: boolean) {
  const room = findRoom(store, slug);
  requireHost(room, userId);
  room.slowMode = Boolean(slow);
  postRoomEvent(room, {
    kind: "system",
    body: room.slowMode ? "Slow chat is on." : "Slow chat is off.",
  });
  return getRoomState(store, slug, userId);
}

export function hostCloseRoom(store: StoreData, slug: string, userId: string) {
  const room = findRoom(store, slug);
  requireHost(room, userId);
  if (room.round?.status === "live") {
    settleRound(store, room, room.round, nowMs());
  }
  for (const playerId of room.playerIds) {
    notify(store, playerId, {
      kind: "system",
      title: `${room.name} closed`,
      body: "The host closed this table.",
      href: "/",
    });
  }
  delete store.rooms[slug];
  return { closed: true as const, slug };
}

export function hostMutePlayer(
  store: StoreData,
  slug: string,
  hostId: string,
  targetId: string,
) {
  const room = findRoom(store, slug);
  if (room.kind !== "custom" || room.ownerId !== hostId) {
    throw new Error("Only the host can mute players.");
  }
  if (targetId === hostId) throw new Error("You cannot mute yourself.");
  const target = store.users[targetId];
  if (!target) throw new Error("That player is not here.");
  room.mutedIds ??= [];
  if (!room.mutedIds.includes(targetId)) room.mutedIds.push(targetId);
  postRoomEvent(room, {
    kind: "system",
    userId: targetId,
    username: target.username,
    body: `${target.username} was muted by the host.`,
  });
  return getRoomState(store, slug, hostId);
}

export function searchPit(
  store: StoreData,
  query: string,
  includeUsers = false,
): SearchHit {
  const q = query.trim().toLowerCase();
  const rooms = (
    q.length < 1
      ? listRoomCards(store).slice(0, 8)
      : listRoomCards(store).filter(
          (room) =>
            room.name.toLowerCase().includes(q) ||
            room.slug.toLowerCase().includes(q) ||
            (room.ownerName ?? "").toLowerCase().includes(q),
        )
  ).slice(0, 12);
  if (!includeUsers || q.length < 1) return { rooms, users: [] };
  const users = Object.values(store.users)
    .filter((user) => user.id !== HOUSE_USER_ID)
    .filter((user) => user.username.toLowerCase().includes(q))
    .slice(0, 12)
    .map((user) => ({
      username: user.username,
      rooms: [] as { slug: string; name: string }[],
    }));
  return { rooms, users };
}
