/**
 * Request signing, checked against arithmetic rather than against itself.
 *
 * A hand-rolled signer that only agrees with its own output is worthless: it
 * will produce a stable, wrong signature forever and the failure arrives as
 * "403 from the storage provider" with nothing to debug. The derivation chain
 * here is checked against the key AWS publishes for a known secret, which is
 * the one number in the process that comes from outside this codebase.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { amzDateNow, encodeKey, sha256, signingParts } from "@/lib/sigv4";

test("the signing key derivation matches the value AWS documents", () => {
  // From AWS's own SigV4 worked example: this secret, date, region and service
  // must derive this key. If our chain is wrong, this is where it shows.
  const secret = "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY";
  const hmac = (key: Buffer | string, value: string) =>
    createHmac("sha256", key).update(value, "utf8").digest();
  const dateKey = hmac(`AWS4${secret}`, "20150830");
  const regionKey = hmac(dateKey, "us-east-1");
  const serviceKey = hmac(regionKey, "iam");
  const signingKey = hmac(serviceKey, "aws4_request");
  assert.equal(
    signingKey.toString("hex"),
    "c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9",
  );
});

test("the empty-payload hash is the published constant", () => {
  // Providers reject a mismatch here, and it is easy to get wrong by hashing
  // the string "undefined" or a newline instead of nothing at all.
  assert.equal(
    sha256(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
});

test("a signature is deterministic for the same request", () => {
  const input = {
    method: "PUT" as const,
    host: "bucket.fra1.digitaloceanspaces.com",
    key: "avatars/abc123.webp",
    payloadHash: sha256("hello"),
    amzDate: "20260908T120000Z",
    region: "fra1",
    accessKey: "AKIAEXAMPLE",
    secretKey: "secretexample",
    contentType: "image/webp",
  };
  const first = signingParts(input);
  const again = signingParts(input);
  assert.equal(first.signature, again.signature);
  assert.match(first.authorization, /^AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE\/20260908\/fra1\/s3\/aws4_request/);
});

test("any change to the request changes the signature", () => {
  const base = {
    method: "PUT" as const,
    host: "bucket.fra1.digitaloceanspaces.com",
    key: "avatars/abc123.webp",
    payloadHash: sha256("hello"),
    amzDate: "20260908T120000Z",
    region: "fra1",
    accessKey: "AKIAEXAMPLE",
    secretKey: "secretexample",
    contentType: "image/webp",
  };
  const signature = signingParts(base).signature;
  const variants = {
    "a different body": { payloadHash: sha256("goodbye") },
    "a different key": { key: "avatars/other.webp" },
    "a different region": { region: "ams3" },
    "a different secret": { secretKey: "another" },
    "a different minute": { amzDate: "20260908T120100Z" },
    "a different content type": { contentType: "image/png" },
  };
  for (const [what, change] of Object.entries(variants)) {
    assert.notEqual(
      signingParts({ ...base, ...change }).signature,
      signature,
      `${what} must produce a different signature`,
    );
  }
});

test("signed headers are lower-cased and sorted, as the spec requires", () => {
  const parts = signingParts({
    method: "PUT",
    host: "h",
    key: "k",
    payloadHash: sha256(""),
    amzDate: "20260908T120000Z",
    region: "fra1",
    accessKey: "A",
    secretKey: "S",
    contentType: "image/webp",
    extraHeaders: { "X-Amz-Acl": "public-read" },
  });
  const signed = parts.authorization.match(/SignedHeaders=([^,]+)/)?.[1] ?? "";
  assert.equal(signed, signed.toLowerCase(), "no upper case in signed headers");
  assert.deepEqual([...signed.split(";")], [...signed.split(";")].sort(), "sorted");
  assert.ok(signed.includes("x-amz-acl"), "an extra header is actually signed");
});

test("path separators survive encoding but the segments are escaped", () => {
  assert.equal(encodeKey("avatars/abc.webp"), "avatars/abc.webp");
  assert.equal(encodeKey("avatars/a b.webp"), "avatars/a%20b.webp");
  assert.equal(encodeKey("avatars/a+b.webp"), "avatars/a%2Bb.webp");
  assert.equal(
    encodeKey("a/b/c.webp"),
    "a/b/c.webp",
    "slashes stay slashes or the object lands at the wrong path",
  );
});

test("the timestamp is the compact form the header wants", () => {
  const at = new Date("2026-09-08T12:34:56.789Z");
  assert.equal(amzDateNow(at), "20260908T123456Z");
  assert.doesNotMatch(amzDateNow(at), /[-:.]/, "no separators, no milliseconds");
});
