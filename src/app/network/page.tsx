import { redirect } from "next/navigation";
import { NetworkFeed } from "@/components/NetworkFeed";

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;
  const name = u?.trim();
  if (name) redirect(`/network/u/${encodeURIComponent(name)}`);
  return <NetworkFeed />;
}
