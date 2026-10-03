import { LazyNotificationsClient } from "@/components/LazyViews";
import { floorYou } from "@/lib/house-you";
import { requirePageUser } from "@/lib/auth";

export default async function NotificationsPage() {
  const user = await requirePageUser("/notifications");
  return <LazyNotificationsClient you={floorYou(user)} />;
}
