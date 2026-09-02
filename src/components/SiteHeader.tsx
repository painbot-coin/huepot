import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { LogoutButton } from "@/components/LogoutButton";
import { MessageLaunch } from "@/components/MessageDock";
import { NotificationBell } from "@/components/NotificationBell";
import { PresencePing } from "@/components/PresencePing";
import { SitClock } from "@/components/SitClock";
import { SoundToggle } from "@/components/SoundToggle";
import { formatUsdt } from "@/lib/money";
import type { PublicUser } from "@/lib/types";

export function SiteHeader({ user }: { user: PublicUser | null }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
      <Link className="brand" href="/">
        <BrandMark />
        <span className="brand-word">Huepot</span>
      </Link>
      <nav className="site-nav">
        <Link className="nav-link" href="/">
          Rooms
        </Link>
        {user ? (
          <Link className="nav-link" href="/network">
            Network
          </Link>
        ) : (
          <Link className="nav-link" href="/how-it-works">
            How it works
          </Link>
        )}
        {user ? (
          <>
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
            <SitClock />
            <SoundToggle className="pit-ico header-sound" />
            <MessageLaunch />
            <NotificationBell />
            <PresencePing />
            <LogoutButton />
          </>
        ) : (
          <>
            <SoundToggle className="pit-ico header-sound" />
            <Link className="chip-btn" href="/signin">
              Sign in
            </Link>
          </>
        )}
      </nav>
      </div>
    </header>
  );
}
