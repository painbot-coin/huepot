import assert from "node:assert/strict";
import test from "node:test";
import { closeDeskSeat, listDeskPeople, setDeskCraft } from "@/lib/house-people";
import { emptyLimits } from "@/lib/limits";
import type { StoreData, User } from "@/lib/types";

function person(id: string, username: string, extra: Partial<User> = {}): User {
  return {
    id,
    email: `${username}@x.test`,
    username,
    passwordHash: "",
    googleId: null,
    emailVerified: true,
    verifyToken: null,
    verifyExpires: null,
    verifySentAt: null,
    createdAt: 1,
    balance: 0,
    bonus: 0,
    withdrawAddress: "",
    wallets: {},
    limits: emptyLimits(),
    ageConfirmedAt: 1,
    resetToken: null,
    resetExpires: null,
    resetSentAt: null,
    inviteCode: "",
    invitedBy: null,
    headline: "hi",
    about: "",
    location: "",
    seat: "",
    ...extra,
  };
}

function storeOf(users: User[]): StoreData {
  const map: StoreData["users"] = {};
  for (const user of users) map[user.id] = user;
  return {
    users: map,
    sessions: {
      tok: { token: "tok", userId: "u2", expiresAt: 9, createdAt: 1, userAgent: "" },
    },
    oauthStates: {},
    notifications: [],
    rooms: {},
    round: null,
    roundNumber: 0,
    txs: [],
    pacts: [],
    hires: [],
    pays: [],
  };
}

test("the desk names every seat and can set a craft", () => {
  const andre = person("u1", "andrecain111", { manager: true });
  const lea = person("u2", "lea");
  const store = storeOf([andre, lea, person("house", "house")]);
  assert.deepEqual(listDeskPeople(store).map((row) => row.username), ["andrecain111", "lea"]);
  setDeskCraft(store, andre, "lea", "ai");
  assert.equal(store.users.u2?.seat, "ai");
  assert.equal(listDeskPeople(store).find((row) => row.username === "lea")?.craft, "AI developer");
});

test("a manager cannot close their own seat or a seat that still holds USDT", () => {
  const andre = person("u1", "andrecain111", { manager: true });
  const lea = person("u2", "lea", { balance: 500 });
  const store = storeOf([andre, lea]);
  assert.throws(() => closeDeskSeat(store, andre, "andrecain111"), /another manager/);
  assert.throws(() => closeDeskSeat(store, andre, "lea"), /USDT/);
  lea.balance = 0;
  closeDeskSeat(store, andre, "lea");
  assert.equal(Boolean(store.users.u2?.closedAt), true);
  assert.equal(store.users.u2?.headline, "");
  assert.equal(store.sessions.tok, undefined);
});
