import { LazyNotificationsClient } from "@/components/LazyViews";
import { requirePageUser } from "@/lib/auth";

export default async function NotificationsPage() {
  await requirePageUser("/notifications");
  return <LazyNotificationsClient />;
}
