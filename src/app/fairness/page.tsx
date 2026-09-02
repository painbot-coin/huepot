import { LazyFairnessClient } from "@/components/LazyViews";

export default async function FairnessPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;
  return <LazyFairnessClient slug={slug} />;
}
