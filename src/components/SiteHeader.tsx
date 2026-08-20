import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { formatUsdt } from "@/lib/money";
import type { PublicUser } from "@/lib/types";

export function SiteHeader({ user }: { user: PublicUser | null }) {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        Huepot
      </Link>
      <nav className="site-nav">
        <Link className="nav-link" href="/">
          Play
        </Link>
        <Link className="nav-link" href="/how-it-works">
          How it works
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
            <NotificationBell />
            <LogoutButton />
          </>
        ) : (
          <>
            <Link className="nav-link" href="/signin">
              Sign in
            </Link>
            <Link className="chip-btn" href="/signup">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
