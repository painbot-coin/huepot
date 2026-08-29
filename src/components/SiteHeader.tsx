import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { SitClock } from "@/components/SitClock";
import { SoundToggle } from "@/components/SoundToggle";
import { formatUsdt } from "@/lib/money";
import type { PublicUser } from "@/lib/types";

export function SiteHeader({ user }: { user: PublicUser | null }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
      <Link className="brand" href="/">
        Huepot
      </Link>
      <nav className="site-nav">
        <Link className="nav-link" href="/">
          Rooms
        </Link>
        <Link className="nav-link" href="/rooms/new">
          Create
        </Link>
        <Link className="nav-link" href="/how-it-works">
          How it works
        </Link>
        <Link className="nav-link" href="/fairness">
          Fairness
        </Link>
        {user ? (
          <>
            <Link className="nav-link" href="/invest">
              Invest
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
            <NotificationBell />
            <LogoutButton />
          </>
        ) : (
          <>
            <Link className="nav-link" href="/signin">
              Sign in
            </Link>
            <SoundToggle className="pit-ico header-sound" />
            <Link className="chip-btn" href="/signup">
              Sign up
            </Link>
          </>
        )}
      </nav>
      </div>
    </header>
  );
}
