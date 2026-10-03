import { listAlikeSeats, seatedAt } from "@/lib/friends";
import { composeHallHome, lastPitOf } from "@/lib/seat-alike";
import type { HallHome, StoreData } from "@/lib/types";

export function hallHomeFor(store: StoreData, userId: string | null): HallHome | null {
  if (!userId) return null;
  const user = store.users[userId];
  if (!user || user.closedAt) return null;
  return composeHallHome(
    lastPitOf(user, { sitting: seatedAt(store, userId) }),
    listAlikeSeats(store, user, 4),
  );
}
