import Link from "next/link";
import type { PublicUser } from "@/lib/types";

export function PlayBlockBanner({ user }: { user: PublicUser }) {
  if (!user.blocked) return null;
  return (
    <div className="verify-banner">
      <p>
        {user.blockMessage}{" "}
        <Link href="/account">Account limits</Link>
      </p>
    </div>
  );
}
