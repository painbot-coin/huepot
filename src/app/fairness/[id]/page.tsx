import { LazyFairnessDetail } from "@/components/LazyViews";

export default async function FairnessRoundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LazyFairnessDetail id={id} />;
}
