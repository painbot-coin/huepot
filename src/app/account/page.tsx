import { LazyAccountClient } from "@/components/LazyViews";
import { requirePageUser } from "@/lib/auth";

export default async function AccountPage() {
  await requirePageUser("/account");
  return <LazyAccountClient />;
}
