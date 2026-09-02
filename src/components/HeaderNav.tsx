"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SoundToggle } from "@/components/SoundToggle";
import { onBank } from "@/lib/bank-sync";
import { formatUsdt } from "@/lib/money";
import type { PublicUser } from "@/lib/types";

const SignedNav = dynamic(
  () => import("@/components/SignedNav").then((mod) => mod.SignedNav),
  { ssr: false },
);

export function HeaderNav({ user }: { user: PublicUser | null }) {
  const [balance, setBalance] = useState(user?.balance ?? 0);

  useEffect(() => {
    setBalance(user?.balance ?? 0);
  }, [user?.balance]);

  useEffect(() => {
    if (!user) return;

    async function pull() {
      try {
        const response = await fetch("/api/auth/me?lite=1");
        if (!response.ok) return;
        const data = (await response.json()) as { user?: { balance?: number } | null };
        if (typeof data.user?.balance === "number") setBalance(data.user.balance);
      } catch {
        /* keep last */
      }
    }

    void pull();
    const id = window.setInterval(() => void pull(), 4000);
    function onVis() {
      if (document.visibilityState === "visible") void pull();
    }
    document.addEventListener("visibilitychange", onVis);
    const off = onBank(setBalance);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      off();
    };
  }, [user]);

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
      <span className="nav-balance">{formatUsdt(balance)} USDT</span>
      <SignedNav />
    </>
  );
}
