import { redirect } from "next/navigation";
import { getSessionToken, userFromToken } from "@/lib/auth";
import { afterGatePath, needsSeatPath } from "@/lib/after-gate";
import { seatOf } from "@/lib/house-seats";
import { withStoreRead } from "@/lib/store";

export async function sendToSeatIfNeeded(next: string) {
  if (!needsSeatPath(next)) return;
  const token = await getSessionToken();
  if (!token) return;
  const user = await withStoreRead((store) => userFromToken(store, token));
  if (!user || seatOf(user.seat)) return;
  redirect(afterGatePath("", next));
}
