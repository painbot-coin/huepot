import { LazyNetworkProfile } from "@/components/LazyViews";

export default async function NetworkProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <LazyNetworkProfile username={decodeURIComponent(username)} />;
}
