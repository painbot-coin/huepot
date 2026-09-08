"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { openMessageDock } from "@/lib/message-dock";
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
  const links = [
    { href: "/network", label: "Board", match: path === "/network" },
    {
      href: "/network/people",
      label: you?.pendingIn ? `Company · ${you.pendingIn}` : "Company",
      match: path.startsWith("/network/people"),
    },
    {
      href: "/network/messages",
      label: you?.unreadMessages ? `Letters · ${you.unreadMessages}` : "Letters",
      match: path.startsWith("/network/messages"),
    },
    { href: me, label: "Seat", match: onMe },
  ];
  return (
    <div className="li-shell">
      <p className="hall-kicker">The wing</p>
      <nav className="li-nav" aria-label="The wing">
        {links.map((link) => (
          <Link
            className={link.match ? "is-on" : ""}
            href={link.href}
            key={link.label}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              if (
                you &&
                link.href === "/network/messages" &&
                !path.startsWith("/network/messages") &&
                !event.metaKey &&
                !event.ctrlKey
              ) {
                event.preventDefault();
                openMessageDock();
              }
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}

export function SignInGate() {
  return (
    <NetworkChrome>
      <main className="app-page text-center">
        <h1 className="font-display text-4xl text-white">The wing</h1>
        <p className="app-lead mx-auto">
          Cross the gate to meet who sits the house.
        </p>
        <Link className="chip-btn mt-6 inline-flex" href="/signin">
          Enter the house
        </Link>
      </main>
    </NetworkChrome>
  );
}
