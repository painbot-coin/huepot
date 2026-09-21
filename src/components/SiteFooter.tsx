import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/config";
import { APP_VERSION } from "@/lib/version";
import type { PublicUser } from "@/lib/types";

export function SiteFooter({ user }: { user?: PublicUser | null }) {
  return (
    <footer className="site-footer">
      <p>
        Huepot v{APP_VERSION} is a timed color-pot house. 18+ only. Play what
        you can afford.
      </p>
      <div className="footer-links">
        {user ? <Link href="/network">Wing</Link> : null}
        <Link href="/how-it-works">Rite</Link>
        <Link href="/news">Wire</Link>
        <Link href="/board">Board</Link>
        <Link href="/fairness">Ledger</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        {user ? (
          <>
            <Link href="/notifications">Notices</Link>
            <Link href="/account">Account</Link>
          </>
        ) : null}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </div>
    </footer>
  );
}
