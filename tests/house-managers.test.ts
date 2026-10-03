import assert from "node:assert/strict";
import test from "node:test";
import {
  claimFirstManager,
  countLiveSeats,
  grantManager,
  isManagerUser,
  listManagerNames,
  managerNotice,
  notifyManagers,
  revokeManager,
} from "@/lib/house-managers";
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
    headline: "",
    about: "",
    location: "",
    ...extra,
  };
}

function storeOf(users: User[]): StoreData {
  const map: StoreData["users"] = {};
  for (const user of users) map[user.id] = user;
  return {
    users: map,
    sessions: {},
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

test("a manager is a flagged seat, never the house", () => {
  const ana = person("u1", "ana", { manager: true });
  const house = person("house", "house", { manager: true });
  assert.equal(isManagerUser(ana), true);
  assert.equal(isManagerUser(house), false);
  assert.equal(isManagerUser(person("u2", "rio")), false);
});

test("an env name is a manager without a flag", () => {
  const was = process.env.MANAGER_USERNAMES;
  process.env.MANAGER_USERNAMES = "Ana, rio";
  try {
    assert.equal(isManagerUser(person("u1", "ana")), true);
    assert.equal(isManagerUser(person("u2", "rio")), true);
    assert.equal(isManagerUser(person("u3", "lea")), false);
  } finally {
    if (was == null) delete process.env.MANAGER_USERNAMES;
    else process.env.MANAGER_USERNAMES = was;
  }
});

test("managers are notified when a seat applies, the applicant is not", () => {
  const store = storeOf([
    person("u1", "ana", { manager: true }),
    person("u2", "rio"),
    person("house", "house"),
  ]);
  const notice = managerNotice("new", "rio", "UI/UX designer", "app-1");
  assert.equal(notice.title, "New application");
  assert.match(notice.body, /@rio/);
  assert.equal(notice.href, "/manage?app=app-1");
  const n = notifyManagers(store, "u2", notice);
  assert.equal(n, 1);
  assert.equal(store.notifications.length, 1);
  assert.equal(store.notifications[0].userId, "u1");
  assert.equal(store.notifications[0].href, "/manage?app=app-1");
});

test("staff can claim the first manager and then roster another", () => {
  const ana = person("u1", "ana");
  const rio = person("u2", "rio");
  const store = storeOf([ana, rio]);
  assert.equal(claimFirstManager(store, ana, false), false);
  assert.equal(claimFirstManager(store, ana, true), true);
  assert.equal(isManagerUser(ana), true);
  assert.equal(claimFirstManager(store, rio, true), false);
  grantManager(store, "rio");
  assert.deepEqual(listManagerNames(store), ["ana", "rio"]);
  revokeManager(store, "rio");
  assert.deepEqual(listManagerNames(store), ["ana"]);
  assert.throws(() => revokeManager(store, "ana"), /at least one/);
});

test("live seats skip the house account and closed seats", () => {
  const store = storeOf([
    person("u1", "ana"),
    person("u2", "rio", { closedAt: 9 }),
    person("house", "house"),
  ]);
  assert.equal(countLiveSeats(store), 1);
});
