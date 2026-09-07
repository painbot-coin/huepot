import { NextResponse } from "next/server";
import { getSessionToken, requireUser, requireVerified } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, storageConfigured } from "@/lib/config";
import { jsonError } from "@/lib/http";
import { imageTypeOf, objectKey, putObject } from "@/lib/storage";
import { withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 12;
const recent = new Map<string, { n: number; resetAt: number }>();

/** True when this account has uploaded too much in the last window. */
function tooMany(userId: string) {
  const now = Date.now();
  const hit = recent.get(userId);
  if (!hit || hit.resetAt < now) {
    recent.set(userId, { n: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  hit.n += 1;
  return hit.n > MAX_PER_WINDOW;
}

function fail(message: string, status: number) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    // Auth reads the store, but the bytes must not travel while the store
    // queue is held — every other request in the house waits in that lane.
    const userId = await withStoreRead((store) => {
      const user = requireUser(store, token);
      requireVerified(user);
      return user.id;
    });

    if (tooMany(userId)) {
      throw fail("That is a lot of pictures. Try again in a few minutes.", 429);
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw fail("Attach an image to upload.", 400);
    if (file.size > MAX_UPLOAD_BYTES) {
      throw fail(`Keep the image under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`, 413);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    // Checked again against the real length: the reported size is a claim.
    if (bytes.length > MAX_UPLOAD_BYTES) {
      throw fail(`Keep the image under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`, 413);
    }
    // Sniffed from the bytes for the same reason: a content type is a claim.
    const kind = imageTypeOf(bytes);
    if (!kind) throw fail("That file is not a JPEG, PNG or WebP.", 415);

    // Checked here rather than at the top so a caller is told what is wrong
    // with their request first, and a missing bucket cannot mask that.
    if (!storageConfigured()) {
      throw fail("Image uploads are not switched on yet.", 503);
    }

    const key = objectKey("avatars", bytes, kind.ext);
    const url = await putObject(key, bytes, kind.mime);
    return NextResponse.json({ url, key, bytes: bytes.length, type: kind.mime });
  } catch (error) {
    return jsonError(error);
  }
}
