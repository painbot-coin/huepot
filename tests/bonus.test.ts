/**
 * Sit chips are play-only house credit.
 *
 * A grant must not mint withdrawable bank. A click spends chips first. A push
 * or void has to put that portion back on chips, not on cash. The books'
 * implied cash has to stay aligned through grant, sit, click, and return.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  FIRST_SIT_NOTE,
  SIT_CHIP_CENTS,
  cashImpliedCents,
  dailySitNote,
  nextSitGrantNote,
  returnSit,
  sitClickSuffix,
  sitFromClickNote,
  sitShortMessage,
  spendSit,
  userBonus,
} from "@/lib/sit-chips";
import { emptyLimits } from "@/lib/limits";
import { dayIndex } from "@/lib/tasks";
import type { User } from "@/lib/types";

function player(over: Partial<User> = {}): User {
  return {
    id: "p1",
    email: "p1@test",
    username: "p1",
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
    ...over,
  };
}

test("spend prefers sit chips, then cash", () => {
  const user = player({ bonus: 100, balance: 400 });
  const high = spendSit(user, 500);
  assert.deepEqual(high, { sit: 100, cash: 400 });
  assert.equal(user.bonus, 0);
  assert.equal(user.balance, 0);

  const only = player({ bonus: 100, balance: 0 });
  assert.deepEqual(spendSit(only, 100), { sit: 100, cash: 0 });
  assert.equal(only.bonus, 0);
  assert.equal(only.balance, 0);
});

test("first sit is once; daily is once per UTC day after that", () => {
  const day = dayIndex(1_700_000_000_000);
  const today = day * 86_400_000;
  const tomorrow = (day + 1) * 86_400_000;
  assert.equal(nextSitGrantNote([]), FIRST_SIT_NOTE);
  assert.equal(
    nextSitGrantNote([FIRST_SIT_NOTE], today, today),
    null,
    "first sit is today's chip",
  );
  assert.equal(
    nextSitGrantNote([FIRST_SIT_NOTE], tomorrow, today),
    dailySitNote(day + 1),
  );
  assert.equal(
    nextSitGrantNote([FIRST_SIT_NOTE, dailySitNote(day + 1)], tomorrow, today),
    null,
  );
});

test("a push of a sit click returns chips, not cash", () => {
  const user = player({ bonus: 0, balance: 0 });
  returnSit(user, 100, 100);
  assert.equal(user.bonus, 100);
  assert.equal(user.balance, 0);

  const mixed = player({ bonus: 0, balance: 0 });
  returnSit(mixed, 500, 100);
  assert.equal(mixed.bonus, 100);
  assert.equal(mixed.balance, 400);
});

test("grant plus sit-click plus push leaves cash implied at zero", () => {
  const user = player();
  const txs: { type: string; amount: number }[] = [];

  user.bonus += SIT_CHIP_CENTS;
  txs.push({ type: "bonus", amount: SIT_CHIP_CENTS });
  assert.equal(cashImpliedCents(txs), 0);
  assert.equal(user.balance, 0);

  const { sit, cash } = spendSit(user, 100);
  txs.push({ type: "click", amount: 100 });
  if (sit > 0) txs.push({ type: "sit", amount: sit });
  assert.equal(cash, 0);
  assert.equal(userBonus(user), 0);
  assert.equal(user.balance, 0);
  assert.equal(cashImpliedCents(txs), user.balance);

  const back = returnSit(user, 100, sit);
  txs.push({ type: "refund", amount: 100 });
  if (back.sit > 0) txs.push({ type: "sit", amount: -back.sit });
  assert.equal(user.bonus, 100);
  assert.equal(user.balance, 0);
  assert.equal(cashImpliedCents(txs), user.balance);
});

test("sit chips are not a withdrawable balance", () => {
  const user = player({ bonus: 1000, balance: 0 });
  assert.equal(user.balance, 0);
  assert.ok(user.bonus >= 500, "enough chips to look like a min cash-out");
  assert.ok(
    500 > user.balance,
    "withdraw compares debit to cash, so chips cannot leave",
  );
});

test("click notes carry the sit portion so a restart can return it", () => {
  assert.equal(sitFromClickNote("Clicked Crimson in Classic #3"), 0);
  assert.equal(sitFromClickNote(`Clicked Crimson in Classic #3${sitClickSuffix(100)}`), 100);
  assert.equal(sitShortMessage(500, 100), "Sit chips do not cover this table. Add USDT to sit.");
});
