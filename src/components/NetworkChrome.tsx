"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { openMessageDock } from "@/lib/message-dock";
import type { NetworkYou } from "@/lib/types";

export function initials(name: string) {
  const clean = name.replace(/[^a-zA-Z0-9]/g, "");
  return (clean.slice(0, 2) || "HP").toUpperCase();
}

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
    { href: "/network", label: "Home", match: path === "/network" },
    {
      href: "/network/people",
      label: you?.pendingIn ? `My Network · ${you.pendingIn}` : "My Network",
      match: path.startsWith("/network/people"),
    },
    {
      href: "/network/messages",
      label: you?.unreadMessages ? `Messaging · ${you.unreadMessages}` : "Messaging",
      match: path.startsWith("/network/messages"),
    },
    { href: me, label: "Me", match: onMe },
  ];
  return (
    <div className="li-shell">
      <nav className="li-nav" aria-label="Network">
        {links.map((link) => (
          <Link
            className={link.match ? "is-on" : ""}
            href={link.href}
            key={link.label}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              if (link.href === "/network/messages" && !event.metaKey && !event.ctrlKey) {
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
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-4xl text-white">Network</h1>
        <p className="mt-3 text-zinc-400">Sign in to meet the pit.</p>
        <Link className="chip-btn mt-6 inline-flex" href="/signin">
          Sign in with Google
        </Link>
      </main>
    </NetworkChrome>
  );
}
