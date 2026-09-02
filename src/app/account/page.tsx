import { LazyAccountClient } from "@/components/LazyViews";
import { requirePageUser } from "@/lib/auth";

export default async function AccountPage() {
  await requirePageUser();
  return <LazyAccountClient />;
}
