import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/config";
import { APP_VERSION } from "@/lib/version";
import type { PublicUser } from "@/lib/types";

export function SiteFooter({ user }: { user?: PublicUser | null }) {
  return (
    <footer className="site-footer">
      <p>
        Huepot v{APP_VERSION} is a timed color-pot game. 18+ only. Play what you
        can afford.
      </p>
      <div className="footer-links">
        {user ? <Link href="/network">Network</Link> : null}
        <Link href="/how-it-works">How it works</Link>
        <Link href="/fairness">Fairness</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/notifications">Notifications</Link>
        <Link href="/account">Account</Link>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </div>
    </footer>
  );
}
