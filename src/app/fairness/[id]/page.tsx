import { FairnessDetail } from "@/components/FairnessDetail";

export default async function FairnessRoundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FairnessDetail id={id} />;
}
