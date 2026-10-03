import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LazySeatPick } from "@/components/LazyViews";
import { floorYou } from "@/lib/house-you";
import { getSessionToken, requirePageUser, userFromToken } from "@/lib/auth";
import { seatOf } from "@/lib/house-seats";
import { safeNext } from "@/lib/next-path";
import { withStoreRead } from "@/lib/store";

export const metadata: Metadata = {
  title: "Your role",
  description: "Name a craft, or sit with none. Game, AI, play, table, or here.",
};

export default async function SeatPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await requirePageUser("/seat");
  const { next } = await searchParams;
  const dest = safeNext(next ?? "") || "/";
  const token = await getSessionToken();
  const user = await withStoreRead((store) => userFromToken(store, token));
  if (user && seatOf(user.seat)) redirect(dest);
  return <LazySeatPick next={dest === "/" ? "" : dest} you={floorYou(user)} />;
}
