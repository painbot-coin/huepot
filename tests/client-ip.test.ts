/**
 * Which address the house believes.
 *
 * This decided a real vulnerability once: trusting the *first* entry of
 * X-Forwarded-For let a caller name themselves, which would have walked past
 * the staff allowlist and the login rate limit. The rule is that the proxy
 * overwrites X-Real-IP with the peer it is actually talking to, so that is the
 * one value a caller cannot choose, and the last X-Forwarded-For entry is the
 * hop the proxy added rather than anything the client wrote.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { clientIpFromHeaders, isLoopback } from "@/lib/client-ip";

const from = (headers: Record<string, string>) =>
  clientIpFromHeaders(new Headers(headers));

test("x-real-ip wins, because it is the value a caller cannot set", () => {
  assert.equal(from({ "x-real-ip": "203.0.113.7" }), "203.0.113.7");
});

test("a forged forwarded-for cannot override the proxy's own header", () => {
  // The attack: claim to be someone else, or to be the trusted loopback.
  assert.equal(
    from({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "127.0.0.1" }),
    "203.0.113.7",
  );
  assert.equal(
    from({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "10.0.0.1, 127.0.0.1" }),
    "203.0.113.7",
  );
});

test("without x-real-ip, the last forwarded entry is used, not the first", () => {
  // The first entry is whatever the caller sent. The last is what the proxy
  // appended, which is the only part of that header worth anything.
  assert.equal(
    from({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" }),
    "203.0.113.7",
    "the proxy's entry, not the caller's claim",
  );
  assert.equal(from({ "x-forwarded-for": "203.0.113.7" }), "203.0.113.7");
});

test("whitespace and IPv4-mapped IPv6 are normalised", () => {
  assert.equal(from({ "x-real-ip": "  203.0.113.7  " }), "203.0.113.7");
  assert.equal(from({ "x-real-ip": "::ffff:203.0.113.7" }), "203.0.113.7");
  assert.equal(from({ "x-forwarded-for": "1.1.1.1,   203.0.113.7  " }), "203.0.113.7");
});

test("no headers at all reads as unknown rather than as anybody", () => {
  assert.equal(from({}), "unknown");
  assert.equal(from({ "x-forwarded-for": "" }), "unknown");
  assert.equal(from({ "x-real-ip": "" }), "unknown");
});

test("unknown is not loopback, so an absent header grants nothing", () => {
  // This is the whole point of the distinction: "I could not tell" must never
  // be treated as "this is the server talking to itself".
  assert.equal(isLoopback("unknown"), false);
  assert.equal(isLoopback("127.0.0.1"), true);
  assert.equal(isLoopback("::1"), true);
  assert.equal(isLoopback("203.0.113.7"), false);
  assert.equal(isLoopback(""), false);
});
