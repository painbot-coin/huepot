"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { hueHexOf } from "@/lib/hues";
import { openMessageDock } from "@/lib/message-dock";
import type { NetworkYou } from "@/lib/types";

export function initials(name: string) {
  const clean = name.replace(/[^a-zA-Z0-9]/g, "");
  return (clean.slice(0, 2) || "HP").toUpperCase();
}

/**
 * A player's face. An uploaded picture when there is one, a house colour
 * behind their initials when they picked one, and initials otherwise â€” so a
 * seat is never blank and nobody is required to upload anything.
 */
export function Avatar({
  username,
  avatar,
  size,
}: {
  username: string;
  avatar?: string;
  size?: "sm" | "lg";
}) {
  const cls = `li-avatar${size ? ` is-${size}` : ""}`;
  const value = (avatar ?? "").trim();

  if (value.startsWith("http")) {
    return (
      <span className={`${cls} has-pic`}>
        {/* Sized by CSS and served from our own bucket, so next/image would
            only add a proxy hop. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={value} />
      </span>
    );
  }
  if (value.startsWith("hue:")) {
    const hex = hueHexOf(value.slice(4));
    if (hex) {
      return (
        <span className={`${cls} has-hue`} style={{ background: hex }}>
          {initials(username)}
        </span>
      );
    }
  }
  return <span className={cls}>{initials(username)}</span>;
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
    { href: "/network", label: "Board", match: path === "/network" },
    {
      href: "/network/people",
      label: you?.pendingIn ? `Company Â· ${you.pendingIn}` : "Company",
      match: path.startsWith("/network/people"),
    },
    {
      href: "/network/messages",
      label: you?.unreadMessages ? `Letters Â· ${you.unreadMessages}` : "Letters",
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
