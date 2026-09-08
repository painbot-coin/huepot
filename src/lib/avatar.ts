import { storageConfigured } from "@/lib/config";
import { AVATAR_HUES } from "@/lib/hues";
import { publicUrl } from "@/lib/storage";
import type { User } from "@/lib/types";

export { AVATAR_HUES };

/**
 * What a player shows as a face. One string, three shapes:
 *
 *   ""             initials, the default
 *   "hue:azure"    initials on a house colour, so nobody has to upload
 *   "https://…"    an uploaded image, and only from our own bucket
 */

/** Where an uploaded avatar is allowed to live. */
function storageOrigin() {
  if (!storageConfigured()) return "";
  try {
    return new URL(publicUrl("probe")).origin;
  } catch {
    return "";
  }
}

/**
 * Cleans a requested avatar or refuses it. A foreign URL is refused rather
 * than stored: it would let a profile pull an image from anywhere, which is a
 * tracking pixel on every page the face appears, and a broken face the day
 * that host goes away.
 */
export function parseAvatar(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return "";

  if (value.startsWith("hue:")) {
    const id = value.slice(4);
    if (!AVATAR_HUES.includes(id)) throw new Error("Pick one of the house colours.");
    return `hue:${id}`;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("That is not a picture the house can use.");
  }
  const origin = storageOrigin();
  if (!origin) throw new Error("Image uploads are not switched on yet.");
  if (url.protocol !== "https:" || url.origin !== origin) {
    throw new Error("A picture has to be one you uploaded here.");
  }
  return url.toString();
}

export function avatarOf(user: User) {
  return (user.avatar ?? "").trim();
}
