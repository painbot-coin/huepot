"use client";

import { usePathname, useRouter } from "next/navigation";
import { SearchDock } from "@/components/SearchDock";
import { HouseNavTabs } from "@/components/HouseUi";
import { useCopy } from "@/components/LocaleRoot";

const TABS = [
  { href: "/", key: "home", match: (path: string) => path === "/" },
  { href: "/network", key: "network", match: (path: string) => path.startsWith("/network") },
  { href: "/wait", key: "games", match: (path: string) => path === "/wait" },
  {
    href: "/wait/store",
    key: "store",
    match: (path: string) => path.startsWith("/wait/store"),
  },
] as const;

export function HouseSearch() {
  const router = useRouter();
  return (
    <SearchDock
      className="is-bar"
      onPickRoom={(slug) => router.push(`/rooms/${slug}`)}
    />
  );
}

export function HouseTabs() {
  const path = usePathname();
  const { copy } = useCopy();
  const current = TABS.find((tab) => tab.match(path))?.href ?? false;
  return (
    <HouseNavTabs
      items={TABS.map((tab) => ({
        href: tab.href,
        label: copy.nav[tab.key],
        id: tab.href,
      }))}
      value={current || false}
    />
  );
}
