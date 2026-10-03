/**
 * Company opens Classic, not a friends list.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPANY_CLASSIC_HREF,
  companyAskBody,
  companyAskHref,
  companyAskTitle,
  companyFormedBody,
  companyFormedHref,
  companyFormedTitle,
  sitClassicLabel,
} from "@/lib/company-door";

test("becoming company opens Classic", () => {
  assert.equal(companyFormedTitle(), "Connected");
  assert.equal(companyFormedBody("danny"), "@danny is connected. Play Classic.");
  assert.equal(companyFormedHref(), COMPANY_CLASSIC_HREF);
  assert.equal(sitClassicLabel(), "Play Classic");
});

test("an ask stays on the requests door", () => {
  assert.equal(companyAskTitle(), "Connection request");
  assert.equal(companyAskBody("bill"), "@bill sent you a connection request.");
  assert.equal(companyAskHref(), "/network/people?tab=requests");
});
