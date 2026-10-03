import type { Metadata } from "next";
import Link from "next/link";
import { HouseFloor } from "@/components/HouseFloor";
import { HouseButton, HouseField, PageHead } from "@/components/HouseUi";
import { offerClient } from "@/app/contracts/actions";
import { formatCents, formatUsdt } from "@/lib/money";
import { getHeaderUser } from "@/lib/auth";
import { floorYou } from "@/lib/house-you";
import { readContracts } from "@/lib/vault-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contracts",
  description:
    "A client and a developer, or a company and an employee, lock terms and vault USDT. The words do not change. This is not a chain.",
};

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const query = await searchParams;
  const user = await getHeaderUser();
  const book = user ? await readContracts() : { pacts: [], names: {} };
  const rows = user
    ? book.pacts.filter((row) => row.fromId === user.id || row.toId === user.id).slice().reverse()
    : [];

  return (
    <HouseFloor you={user ? floorYou(user) : null}>
      <main className="app-page is-in-floor">
        <PageHead
          lead="A client locks terms with a developer, or a company locks them with an employee. The price comes out of the vault and stays there until delivery. The other seat gets a notice for the offer, the acceptance, and the delivery. Neither side can edit the words. This is vault USDT. It is not a chain. The pot stays on Classic."
          title="Contracts"
        />
        {query.e ? <p className="account-note">{query.e}</p> : null}
        {!user ? (
          <p>
            <HouseButton href="/signin?next=%2Fcontracts">Sign in to write a contract</HouseButton>
          </p>
        ) : rows.length === 0 ? (
          <p className="account-note">No contracts yet. Vault {formatUsdt(user.balance)} USDT. Play credit cannot lock a contract.</p>
        ) : (
          <div className="hall-doors">
            {rows.map((row) => (
              <Link className="hall-door" href={`/contracts/${row.id}`} key={row.id}>
                <strong>{row.title}</strong>
                <span>
                  {row.kind === "company" ? "Company" : "Client"} · {row.status} · {formatCents(row.priceCents)} USDT
                </span>
              </Link>
            ))}
          </div>
        )}
        {user ? (
          <form action={offerClient} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
            <HouseField label="Developer username" name="username" required fullWidth />
            <HouseField label="Title" name="title" required fullWidth />
            <HouseField label="Terms" name="terms" required fullWidth multiline minRows={3} />
            <HouseField label="Price in USDT" name="price" required fullWidth />
            <HouseButton type="submit">Lock the contract</HouseButton>
          </form>
        ) : null}
        <p className="account-note">
          Minimum 1 USDT. A contract locks at most 100,000 USDT, and never more than the vault balance.
          A lock that is still offered or accepted returns after 48 hours. A delivery the locker does
          not release is paid to the worker after 48 hours. Play credit stays play credit. A hire locks the same vault. This is not a chain.
        </p>
      </main>
    </HouseFloor>
  );
}
