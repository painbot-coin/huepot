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
  assert.equal(companyFormedTitle(), "Company");
  assert.equal(companyFormedBody("danny"), "@danny is company. Sit Classic.");
  assert.equal(companyFormedHref(), COMPANY_CLASSIC_HREF);
  assert.equal(sitClassicLabel(), "Sit Classic");
});

test("an ask stays on the requests door", () => {
  assert.equal(companyAskTitle(), "Company ask");
  assert.equal(companyAskBody("bill"), "@bill wants you in company.");
  assert.equal(companyAskHref(), "/network/people?tab=requests");
});
