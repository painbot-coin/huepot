import test from "node:test";
import assert from "node:assert/strict";
import { noticeAlert, noticeAlertClass, noticeKindLabel } from "@/lib/notice-desk";

test("notices map to four house alerts", () => {
  assert.equal(noticeAlert("payout"), "ok");
  assert.equal(noticeAlert("deposit"), "ok");
  assert.equal(noticeAlert("withdraw"), "warn");
  assert.equal(noticeAlert("refund"), "halt");
  assert.equal(noticeAlert("message"), "note");
  assert.equal(noticeKindLabel("payout"), "Take");
  assert.equal(noticeKindLabel("deposit"), "Gold in");
  assert.equal(noticeKindLabel("friend"), "Company");
  assert.match(noticeAlertClass("payout", false), /notice-alert is-ok is-payout is-unread/);
  assert.doesNotMatch(noticeAlertClass("system", true), /is-unread/);
});
