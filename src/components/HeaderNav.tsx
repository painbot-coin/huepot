"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { SoundToggle } from "@/components/SoundToggle";
import { formatUsdt } from "@/lib/money";
import type { PublicUser } from "@/lib/types";

const SignedNav = dynamic(
  () => import("@/components/SignedNav").then((mod) => mod.SignedNav),
  { ssr: false },
);

export function HeaderNav({ user }: { user: PublicUser | null }) {
  if (!user) {
    return (
      <>
        <Link className="nav-link" href="/how-it-works">
          How it works
        </Link>
        <SoundToggle className="pit-ico header-sound" />
        <Link className="chip-btn" href="/signin">
          Sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <Link className="nav-link" href="/network">
        Network
      </Link>
      <Link className="nav-link" href="/invest">
        Add USDT
      </Link>
      <Link className="nav-link" href="/withdraw">
        Withdraw
      </Link>
      <Link className="nav-link" href="/account">
        @{user.username}
      </Link>
      <span className="nav-balance">{formatUsdt(user.balance)} USDT</span>
      <SignedNav />
    </>
  );
}
