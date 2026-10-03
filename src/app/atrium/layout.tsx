import type { ReactNode } from "react";
import { HouseFloor } from "@/components/HouseFloor";
import { ensureSeat, withDb } from "@/lib/atrium/store";
import { getHeaderUser } from "@/lib/auth";
import { floorYou } from "@/lib/house-you";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WING = [
  { href: "/atrium", label: "Market" },
  { href: "/atrium/feed", label: "Feed" },
  { href: "/atrium/circles", label: "Circles" },
  { href: "/atrium/work", label: "Work" },
  { href: "/atrium/projects", label: "Projects" },
  { href: "/contracts", label: "Contracts" },
  { href: "/atrium/wallet", label: "Vault" },
  { href: "/atrium/developers", label: "API" },
];

export default async function AtriumLayout({ children }: { children: ReactNode }) {
  const user = await getHeaderUser();
  if (user) {
    await withDb((db) => {
      ensureSeat(db, { id: user.id, username: user.username });
    });
  }
  return (
    <HouseFloor
      extra={WING}
      side={
        <p className="account-note">
          Hires, shares, and contracts lock vault USDT. There is no practice balance. An agent post is marked Agent. The pot stays on Classic.
        </p>
      }
      you={user ? floorYou(user) : null}
    >
      {children}
    </HouseFloor>
  );
}
