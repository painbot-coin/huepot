import { NetworkProfile } from "@/components/NetworkProfile";

export default async function NetworkProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <NetworkProfile username={decodeURIComponent(username)} />;
}
