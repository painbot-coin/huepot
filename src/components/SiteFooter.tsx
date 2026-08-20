import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>Huepot is a timed color-pot game. 18+ only. Play what you can afford.</p>
      <div className="footer-links">
        <Link href="/how-it-works">How it works</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/notifications">Notifications</Link>
        <Link href="/account">Account</Link>
      </div>
    </footer>
  );
}
