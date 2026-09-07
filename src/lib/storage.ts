import { spacesConfig, storageConfigured } from "@/lib/config";
import { amzDateNow, encodeKey, sha256, signingParts } from "@/lib/sigv4";

/** Object storage on an S3-compatible bucket (DigitalOcean Spaces). */

function endpointHost() {
  const { bucket, region } = spacesConfig();
  return `${bucket}.${region}.digitaloceanspaces.com`;
}

/** Where a stored object is read from: the CDN host when one is configured. */
export function publicUrl(key: string) {
  const { cdn } = spacesConfig();
  if (cdn) return `${cdn}/${encodeKey(key)}`;
  return `https://${endpointHost()}/${encodeKey(key)}`;
}

async function send(
  method: "PUT" | "DELETE",
  key: string,
  body?: Buffer,
  contentType?: string,
) {
  if (!storageConfigured()) throw new Error("Image storage is not set up yet.");
  const { region, key: accessKey, secret } = spacesConfig();
  const host = endpointHost();
  const amzDate = amzDateNow();
  const payloadHash = body ? sha256(body) : sha256("");

  const signed = signingParts({
    method,
    host,
    key,
    payloadHash,
    contentType,
    amzDate,
    region,
    accessKey,
    secretKey: secret,
    // Uploads are read by anyone holding the URL. Nothing private goes here.
    ...(method === "PUT" ? { extraHeaders: { "x-amz-acl": "public-read" } } : {}),
  });

  const response = await fetch(`https://${host}/${encodeKey(key)}`, {
    method,
    headers: { ...signed.headers, Authorization: signed.authorization },
    // A view rather than the Buffer itself: fetch takes array buffer views and
    // this avoids copying the bytes. The cast pins the buffer to a plain
    // ArrayBuffer, which is what a request body accepts.
    body: body
      ? new Uint8Array(body.buffer as ArrayBuffer, body.byteOffset, body.byteLength)
      : undefined,
  });
  if (!response.ok) {
    // The body carries the bucket's own reason, which is worth keeping.
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`Storage ${method} failed (${response.status}). ${detail}`);
  }
  return publicUrl(key);
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  return send("PUT", key, body, contentType);
}

export async function deleteObject(key: string) {
  await send("DELETE", key);
}

/** Sniffed from the bytes, because a content-type header is only a claim. */
export function imageTypeOf(bytes: Buffer): { mime: string; ext: string } | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, i) => bytes[i] === byte)) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

/**
 * Content addressed, so the same picture uploaded twice costs one object and a
 * key cannot be guessed from an account id.
 */
export function objectKey(prefix: string, bytes: Buffer, ext: string) {
  return `${prefix}/${sha256(bytes).slice(0, 32)}.${ext}`;
}
