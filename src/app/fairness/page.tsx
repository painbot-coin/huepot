import { FairnessClient } from "@/components/FairnessClient";

export default async function FairnessPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;
  return <FairnessClient slug={slug} />;
}
