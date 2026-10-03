"use client";
import { HouseButton } from "@/components/HouseUi";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { HouseFloor, floorYou } from "@/components/HouseFloor";
import { safeNext } from "@/lib/next-path";
import type { NetworkYou } from "@/lib/types";

export function NetworkChrome({
  you,
  children,
}: {
  you?: NetworkYou | null;
  children: ReactNode;
}) {
  const path = usePathname();
  const me = you?.username ? `/network/u/${encodeURIComponent(you.username)}` : "/network";
  const onMe =
    Boolean(you?.username) &&
    (path === me || path === `/network/u/${you?.username}`);
  const extra = you
    ? [
        { href: "/network", label: "Feed", match: path === "/network" },
        {
          href: "/network/people",
          label: you.pendingIn ? `People · ${you.pendingIn}` : "People",
          match: path.startsWith("/network/people"),
        },
        {
          href: "/network/messages",
          label: you.unreadMessages ? `Messages · ${you.unreadMessages}` : "Messages",
          match: path.startsWith("/network/messages"),
          dock: true,
        },
        { href: me, label: "Profile", match: onMe },
      ]
    : [];

  return (
    <HouseFloor extra={extra} kicker="Network" you={floorYou(you)}>
      {children}
    </HouseFloor>
  );
}

export function SignInGate() {
  const path = usePathname();
  const search = useSearchParams();
  const q = search.toString();
  const next = safeNext(q ? `${path}?${q}` : path);
  return (
    <NetworkChrome>
      <main className="app-page is-in-floor text-center">
        <h1 className="font-display text-4xl text-white">Network</h1>
        <p className="app-lead mx-auto">
          Game developers, AI developers, gamers, and bettors meet here.
          Sign in to pick a role.
        </p>
        <HouseButton
          className="mt-6 inline-flex"
          href={next ? `/signin?next=${encodeURIComponent(next)}` : "/signin"}
        >
          Join Huepot
        </HouseButton>
      </main>
    </NetworkChrome>
  );
}
