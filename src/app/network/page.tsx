import { redirect } from "next/navigation";
import { LazyNetworkFeed } from "@/components/LazyViews";

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; post?: string }>;
}) {
  const { u, post } = await searchParams;
  const name = u?.trim();
  if (name) redirect(`/network/u/${encodeURIComponent(name)}`);
  const focusPost = (post ?? "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80);
  return <LazyNetworkFeed focusPost={focusPost} />;
}
