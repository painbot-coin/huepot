import { GameClient } from "@/components/GameClient";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <GameClient slug={slug} />;
}
