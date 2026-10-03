"use client";

import Button from "@mui/material/Button";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import HouseLink from "@/components/HouseLink";
import { HouseButton } from "@/components/HouseUi";
import { SoundToggle } from "@/components/SoundToggle";
import { onBank } from "@/lib/bank-sync";
import { classicHourAt } from "@/lib/classic-hour";
import { headerHourHref, headerHourLabel, showHeaderHour } from "@/lib/hour-door";
import { nightHourAt } from "@/lib/night-hour";
import { formatUsdt } from "@/lib/money";
import { safeNext } from "@/lib/next-path";
import { companyNavLink } from "@/lib/sit-pulse";
import type { CompanySit, PublicUser } from "@/lib/types";
import { useCopy } from "@/components/LocaleRoot";

const SignedNav = dynamic(
  () => import("@/components/SignedNav").then((mod) => mod.SignedNav),
  { ssr: false },
);

export function HeaderNav({ user }: { user: PublicUser | null }) {
  const path = usePathname();
  const { copy } = useCopy();
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
    const id = window.setInterval(() => void pull(), 12_000);
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

  return (
    <>
      {hourDoor ? (
        <Button component={HouseLink} href={hourHref} size="small">
          {hourLabel}
        </Button>
      ) : null}
      {user && bonus > 0 ? (
        <Button component={HouseLink} href="/rooms/classic" size="small">
          {formatUsdt(bonus)} {copy.line.playCredit}
        </Button>
      ) : null}
      {showCompany && company ? (
        <Button component={HouseLink} href={company.href} size="small">
          {company.label}
        </Button>
      ) : null}
      {user ? (
        <>
          <Button component={HouseLink} href="/account" size="small" title="USDT on this account">
            {formatUsdt(balance)}
          </Button>
          {user.manager || user.reviewer ? (
            <Button component={HouseLink} href="/manage" size="small">
              {copy.page.manage}
            </Button>
          ) : null}
          <SignedNav
            manager={Boolean(user.manager)}
            reviewer={Boolean(user.reviewer)}
            username={user.username}
          />
        </>
      ) : (
        <>
          <SoundToggle className="pit-ico header-sound" />
          {path !== "/signin" ? (
            <HouseButton href={back ? `/signin?next=${encodeURIComponent(back)}` : "/signin"}>
              {copy.cta.signIn}
            </HouseButton>
          ) : null}
        </>
      )}
    </>
  );
}
