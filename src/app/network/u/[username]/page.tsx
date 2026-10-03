import { LazyNetworkProfile } from "@/components/LazyViews";
import { sendToSeatIfNeeded } from "@/lib/send-to-seat";

export default async function NetworkProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const name = decodeURIComponent(username);
  await sendToSeatIfNeeded(`/network/u/${encodeURIComponent(name)}`);
  return <LazyNetworkProfile username={name} />;
}
