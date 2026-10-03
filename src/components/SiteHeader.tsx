import { HeaderNav } from "@/components/HeaderNav";
import { HouseAppBar } from "@/components/HouseAppBar";
import type { PublicUser } from "@/lib/types";

export function SiteHeader({ user }: { user: PublicUser | null }) {
  return <HouseAppBar nav={<HeaderNav user={user} />} />;
}
