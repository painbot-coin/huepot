"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SoundToggle } from "@/components/SoundToggle";
import { onBank } from "@/lib/bank-sync";
import { classicHourAt } from "@/lib/classic-hour";
import { showHeaderBoard } from "@/lib/house-board";
import { headerHourHref, headerHourLabel, showHeaderHour } from "@/lib/hour-door";
import { nightHourAt } from "@/lib/night-hour";
import { formatUsdt } from "@/lib/money";
import { safeNext } from "@/lib/next-path";
import { companyNavLink } from "@/lib/sit-pulse";
import type { CompanySit, PublicUser } from "@/lib/types";

const SignedNav = dynamic(
  () => import("@/components/SignedNav").then((mod) => mod.SignedNav),
  { ssr: false },
);

export function HeaderNav({ user }: { user: PublicUser | null }) {
  const path = usePathname();
  const [balance, setBalance] = useState(user?.balance ?? 0);
  const [bonus, setBonus] = useState(user?.bonus ?? 0);
  const [companySitting, setCompanySitting] = useState<CompanySit[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setBalance(user?.balance ?? 0);
    setBonus(user?.bonus ?? 0);
  }, [user?.balance, user?.bonus]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;

    async function pull() {
      try {
        const response = await fetch("/api/auth/me?lite=1");
        if (!response.ok) return;
        const data = (await response.json()) as {
          user?: { balance?: number; bonus?: number } | null;
          companySitting?: CompanySit[];
        };
        if (typeof data.user?.balance === "number") setBalance(data.user.balance);
        if (typeof data.user?.bonus === "number") setBonus(data.user.bonus);
        if (Array.isArray(data.companySitting)) setCompanySitting(data.companySitting);
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
    const off = onBank((next, sit) => {
      setBalance(next);
      if (typeof sit === "number") setBonus(sit);
    });
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      off();
    };
  }, [user]);

  const back = safeNext(path);
  const hour = classicHourAt(now);
  const night = nightHourAt(now);
  const hourLabel = headerHourLabel(hour, now, night);
  const hourDoor = showHeaderHour(path, hour, now, night);
  const hourHref = headerHourHref(hour, night, now);
  const company = companyNavLink(companySitting);
  const companyHref = company?.href ?? "";
  const showCompany =
    Boolean(user && company) &&
    path !== "/" &&
    path !== companyHref &&
    !path.startsWith(`${companyHref}?`);
  if (!user) {
    return (
      <>
        <Link className="nav-link" href="/how-it-works">
          Rite
        </Link>
        <Link className="nav-link" href="/news">
          Wire
        </Link>
        {showHeaderBoard(path) ? (
          <Link className="nav-link" href="/board">
            Board
          </Link>
        ) : null}
        {path !== "/network" && !path.startsWith("/network?") ? (
          <Link className="nav-link" href="/network">
            Wing
          </Link>
        ) : null}
        <SoundToggle className="pit-ico header-sound" />
        {hourDoor ? (
          <Link className="nav-sit" href={hourHref}>
            {hourLabel}
          </Link>
        ) : null}
        {path !== "/signin" ? (
          <Link
            className="chip-btn"
            href={back ? `/signin?next=${encodeURIComponent(back)}` : "/signin"}
          >
            Sign in
          </Link>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Link className="nav-link" href="/how-it-works">
        Rite
      </Link>
      <Link className="nav-link" href="/news">
        Wire
      </Link>
      {showHeaderBoard(path) ? (
        <Link className="nav-link" href="/board">
          Board
        </Link>
      ) : null}
      <Link className="nav-link" href="/network">
        Wing
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
      {hourDoor ? (
        <Link className="nav-sit" href={hourHref}>
          {hourLabel}
        </Link>
      ) : null}
      {bonus > 0 ? (
        <Link className="nav-sit" href="/rooms/classic">
          {formatUsdt(bonus)} to sit
        </Link>
      ) : null}
      {showCompany && company ? (
        <Link className="nav-company" href={company.href}>
          {company.label}
        </Link>
      ) : null}
      <SignedNav />
    </>
  );
}
