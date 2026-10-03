import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LazyNetworkFeed } from "@/components/LazyViews";
import { sendToSeatIfNeeded } from "@/lib/send-to-seat";

export const metadata: Metadata = {
  title: "Network",
  description:
    "Game developers, AI developers, gamers, and bettors meet here. Share a project. Message a member. The pot stays on Classic.",
};

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; post?: string }>;
}) {
  await sendToSeatIfNeeded("/network");
  const { u, post } = await searchParams;
  const name = u?.trim();
  if (name) redirect(`/network/u/${encodeURIComponent(name)}`);
  const focusPost = (post ?? "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80);
  return <LazyNetworkFeed focusPost={focusPost} />;
}
