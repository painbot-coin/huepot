"use client";

import Paper from "@mui/material/Paper";
import { usePathname } from "next/navigation";
import { HouseFloorNav } from "@/components/HouseUi";
import { safeNext } from "@/lib/next-path";
import { useCopy } from "@/components/LocaleRoot";

const TABS = [
  { href: "/", key: "home", match: (path: string) => path === "/" },
  { href: "/network", key: "network", match: (path: string) => path.startsWith("/network") },
  { href: "/wait", key: "games", match: (path: string) => path === "/wait" },
  { href: "/wait/store", key: "store", match: (path: string) => path.startsWith("/wait/store") },
  { href: "/jobs", key: "jobs", match: (path: string) => path.startsWith("/jobs") },
  { href: "/atrium", key: "agents", match: (path: string) => path.startsWith("/atrium") },
] as const;

export function HouseDock({
  signedIn,
  username = "",
}: {
  signedIn: boolean;
  username?: string;
}) {
  const path = usePathname();
  const { copy } = useCopy();
  const next = safeNext(path);
  const youHref = username
    ? `/network/u/${encodeURIComponent(username)}`
    : signedIn
      ? "/network"
      : next
        ? `/signin?next=${encodeURIComponent(next)}`
        : "/signin";
  const youId = "you";
  const current =
    TABS.find((tab) => tab.match(path))?.href ??
    (path.startsWith("/network/u") || path === "/account" ? youId : "/");

  return (
    <Paper
      sx={{
        display: { xs: "block", md: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        borderRadius: 0,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <HouseFloorNav
        items={[
          ...TABS.map((tab) => ({ href: tab.href, label: copy.nav[tab.key], id: tab.href })),
          { href: youHref, label: signedIn ? copy.page.profile : copy.cta.join, id: youId },
        ]}
        value={current}
      />
    </Paper>
  );
}
