import { LazyWithdrawClient } from "@/components/LazyViews";
import { requirePageUser } from "@/lib/auth";

export default async function WithdrawPage() {
  await requirePageUser();
  return <LazyWithdrawClient />;
}
