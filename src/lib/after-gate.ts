/**
 * After Google, a new seat has to name itself before the hall.
 * No skip. The wing and the store stay empty-looking until then.
 */

import { seatOf } from "@/lib/house-seats";
import { safeNext } from "@/lib/next-path";

export function afterGatePath(seat: string | undefined | null, next: string) {
  const dest = safeNext(next);
  if (seatOf(seat)) return dest || "/";
  if (!dest || dest === "/seat" || dest.startsWith("/seat?")) return "/seat";
  return `/seat?next=${encodeURIComponent(dest)}`;
}

export function needsSeatPath(path: string) {
  const clean = (path.split("?")[0] || "").replace(/\/+$/, "") || "/";
  if (clean === "/seat") return false;
  if (clean === "/") return true;
  if (clean === "/network" || clean.startsWith("/network/")) return true;
  if (clean === "/wait" || clean.startsWith("/wait/")) return true;
  return false;
}
