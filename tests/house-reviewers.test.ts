import assert from "node:assert/strict";
import test from "node:test";
import {
  canKeepDesk,
  claimFirstReviewer,
  grantReviewer,
  isReviewerUser,
  listReviewerNames,
  notifyNewReport,
  reportNotice,
  revokeReviewer,
} from "@/lib/house-reviewers";
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

test("a reviewer is a flagged seat, never the house", () => {
  const ana = person("u1", "ana", { reviewer: true });
  const house = person("house", "house", { reviewer: true });
  assert.equal(isReviewerUser(ana), true);
  assert.equal(isReviewerUser(house), false);
  assert.equal(isReviewerUser(person("u2", "rio")), false);
  assert.equal(canKeepDesk(ana), true);
  assert.equal(canKeepDesk(person("u3", "lea", { manager: true })), true);
  assert.equal(canKeepDesk(person("u4", "ned")), false);
});

test("an env name is a reviewer without a flag", () => {
  const was = process.env.REVIEWER_USERNAMES;
  process.env.REVIEWER_USERNAMES = "Ana, rio";
  try {
    assert.equal(isReviewerUser(person("u1", "ana")), true);
    assert.equal(isReviewerUser(person("u2", "rio")), true);
    assert.equal(isReviewerUser(person("u3", "lea")), false);
  } finally {
    if (was == null) delete process.env.REVIEWER_USERNAMES;
    else process.env.REVIEWER_USERNAMES = was;
  }
});

test("reviewers hear a new report; the named seat and the filer do not", () => {
  const store = storeOf([
    person("u1", "ana", { reviewer: true }),
    person("u2", "rio"),
    person("u3", "lea"),
    person("house", "house"),
  ]);
  const notice = reportNotice("rio", "rep-1");
  assert.equal(notice.title, "New report");
  assert.match(notice.body, /@rio/);
  assert.equal(notice.href, "/manage?report=rep-1");
  const n = notifyNewReport(store, { id: "rep-1", reporterId: "u3", username: "rio" });
  assert.equal(n, 1);
  assert.equal(store.notifications.length, 1);
  assert.equal(store.notifications[0].userId, "u1");
  assert.equal(store.notifications[0].href, "/manage?report=rep-1");
});

test("an empty report roster falls back to managers", () => {
  const store = storeOf([person("u1", "ana", { manager: true }), person("u2", "rio")]);
  const n = notifyNewReport(store, { id: "rep-2", reporterId: "u2", username: "rio" });
  assert.equal(n, 1);
  assert.equal(store.notifications[0]?.userId, "u1");
});

test("staff or a manager can claim the first reviewer and then roster another", () => {
  const ana = person("u1", "ana", { manager: true });
  const rio = person("u2", "rio");
  const store = storeOf([ana, rio]);
  assert.equal(claimFirstReviewer(store, ana, false), false);
  assert.equal(claimFirstReviewer(store, ana, true), true);
  assert.equal(isReviewerUser(ana), true);
  assert.equal(claimFirstReviewer(store, rio, true), false);
  grantReviewer(store, "rio");
  assert.deepEqual(listReviewerNames(store), ["ana", "rio"]);
  revokeReviewer(store, "rio");
  assert.deepEqual(listReviewerNames(store), ["ana"]);
  assert.throws(() => revokeReviewer(store, "ana"), /at least one/);
});
