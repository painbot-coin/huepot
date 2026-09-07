import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { HeaderNav } from "@/components/HeaderNav";
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
          Hall
        </Link>
        <HeaderNav user={user} />
      </nav>
      </div>
    </header>
  );
}
