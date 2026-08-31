import type { Metadata } from "next";
import { GameClient } from "@/components/GameClient";
import { BASIC_ROOMS } from "@/lib/rooms";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const house = BASIC_ROOMS.find((room) => room.slug === slug);
  const name = house?.name ?? "Table";
  return {
    title: `${name} — Huepot`,
    description:
      house?.blurb ?? "Same-price color buttons. Biggest color splits the rest of the pot.",
  };
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <GameClient slug={slug} />;
}
