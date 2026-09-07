import { createHash, createHmac } from "node:crypto";

/**
 * AWS Signature Version 4 for S3-compatible storage.
 *
 * Signed here rather than through a vendor SDK: the app runs on four
 * dependencies, and this is a hash chain that can be checked against AWS's
 * own published example. No app imports, so it can be run on its own.
 */

const SERVICE = "s3";
const ALGORITHM = "AWS4-HMAC-SHA256";

export const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

const hmac = (key: Buffer | string, value: string) =>
  createHmac("sha256", key).update(value, "utf8").digest();

/** Every path segment is encoded; the separators stay separators. */
export function encodeKey(key: string) {
  return key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function amzDateNow(at = new Date()) {
  return `${at.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
}

export type SigningInput = {
  method: "PUT" | "DELETE" | "GET";
  host: string;
  key: string;
  payloadHash: string;
  amzDate: string;
  region: string;
  accessKey: string;
  secretKey: string;
  contentType?: string;
  extraHeaders?: Record<string, string>;
};

export function signingParts(input: SigningInput) {
  const dateStamp = input.amzDate.slice(0, 8);
  const scope = `${dateStamp}/${input.region}/${SERVICE}/aws4_request`;

  const headers: Record<string, string> = {
    host: input.host,
    "x-amz-content-sha256": input.payloadHash,
    "x-amz-date": input.amzDate,
    ...(input.contentType ? { "content-type": input.contentType } : {}),
    ...(input.extraHeaders ?? {}),
  };
  const names = Object.keys(headers)
    .map((name) => name.toLowerCase())
    .sort();
  const canonicalHeaders = names
    .map((name) => `${name}:${String(headers[name]).trim()}\n`)
    .join("");
  const signedHeaders = names.join(";");

  const canonicalRequest = [
    input.method,
    `/${encodeKey(input.key)}`,
    "",
    canonicalHeaders,
    signedHeaders,
    input.payloadHash,
  ].join("\n");

  const stringToSign = [
    ALGORITHM,
    input.amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  const dateKey = hmac(`AWS4${input.secretKey}`, dateStamp);
  const regionKey = hmac(dateKey, input.region);
  const serviceKey = hmac(regionKey, SERVICE);
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authorization = `${ALGORITHM} Credential=${input.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { canonicalRequest, stringToSign, signature, authorization, headers };
}
