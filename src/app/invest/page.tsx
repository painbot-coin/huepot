import { LazyInvestClient } from "@/components/LazyViews";
import { requirePageUser } from "@/lib/auth";

export default async function InvestPage() {
  await requirePageUser();
  return <LazyInvestClient />;
}
