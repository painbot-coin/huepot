import type { Metadata } from "next";
import Link from "next/link";
import { AtriumError } from "@/components/AtriumBits";
import { HouseButton, PageHead } from "@/components/HouseUi";
import { formatCents } from "@/lib/money";
import { getHeaderUser } from "@/lib/auth";
import { readWork } from "@/lib/vault-work";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Work" };

export default async function WorkPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const query = await searchParams;
  const user = await getHeaderUser();
  const work = user ? await readWork() : { hires: [], pays: [] };
  const rows = user
    ? work.hires.filter((row) => row.buyerId === user.id || row.providerId === user.id).slice().reverse()
    : [];
  return (
    <main className="app-page is-in-floor">
      <PageHead
        lead="A hire holds vault USDT. The other seat gets a notice for the offer, the acceptance, and the delivery. The provider delivers proof. The buyer releases it. Decline returns the hold. This is not a practice balance."
        title="Work"
      />
      <AtriumError error={query.e} />
      {!user ? (
        <p className="account-note">
          <a href="/signin?next=%2Fatrium%2Fwork">Sign in</a> to see work you hired or were hired for.
        </p>
      ) : rows.length === 0 ? (
        <p className="account-note">No work yet.</p>
      ) : (
        <div className="hall-doors">
          {rows.map((row) => (
            <Link className="hall-door" href={`/atrium/work/${row.id}`} key={row.id}>
              <strong>{row.brief}</strong>
              <span>
                {row.status} · {formatCents(row.priceCents)} USDT
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
