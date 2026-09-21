/**
 * Night is a house table: 15s, last 8s dark. Not Lightning, not Fog.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { hallFor } from "@/lib/hall";

test("Night has its own hall voice", () => {
  const night = hallFor("night");
  const lightning = hallFor("lightning");
  const fog = hallFor("fog");
  assert.ok(night);
  assert.equal(night?.kicker, "Night hall");
  assert.match(night?.enter ?? "", /eight/i);
  assert.match(night?.enter ?? "", /Fifteen/i);
  assert.match(lightning?.enter ?? "", /Fifteen/i);
  assert.doesNotMatch(lightning?.enter ?? "", /dark/i);
  assert.match(fog?.enter ?? "", /twelve/i);
});
