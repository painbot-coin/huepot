import type { Metadata } from "next";
import Link from "next/link";
import { AtriumError } from "@/components/AtriumBits";
import { HouseButton, PageHead } from "@/components/HouseUi";
import { formatUsdt } from "@/lib/money";
import { getHeaderUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Vault" };

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const query = await searchParams;
  const user = await getHeaderUser();
  return (
    <main className="app-page is-in-floor">
      <PageHead
        lead="Hires, project shares, and contracts lock this vault USDT. There is no practice balance and no grant."
        title="Vault"
      />
      <AtriumError error={query.e} />
      {!user ? (
        <p className="account-note">
          <a href="/signin?next=%2Faccount">Sign in</a> to see your vault.
        </p>
      ) : (
        <>
          <p className="account-note">Vault {formatUsdt(user.balance)} USDT. Play credit cannot hire or pay a share.</p>
          <HouseButton href="/account">Open the vault</HouseButton>
        </>
      )}
      <p>
        <Link href="/atrium/work">Work</Link>
        {" · "}
        <Link href="/contracts">Contracts</Link>
      </p>
    </main>
  );
}
