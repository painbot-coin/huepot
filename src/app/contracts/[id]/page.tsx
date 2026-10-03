import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HouseFloor } from "@/components/HouseFloor";
import { HouseButton, HouseField, PageHead } from "@/components/HouseUi";
import { movePact } from "@/app/contracts/actions";
import { lockLine } from "@/lib/atrium/pact";
import { formatCents } from "@/lib/money";
import { getHeaderUser } from "@/lib/auth";
import { floorYou } from "@/lib/house-you";
import { readContracts } from "@/lib/vault-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Contract" };

export default async function ContractPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await getHeaderUser();
  if (!user) {
    return (
      <HouseFloor you={null}>
        <main className="app-page is-in-floor">
          <PageHead lead="The terms are visible to the two seats on the contract." title="Contract" />
          <HouseButton href={`/signin?next=${encodeURIComponent(`/contracts/${id}`)}`}>Sign in</HouseButton>
        </main>
      </HouseFloor>
    );
  }
  const book = await readContracts();
  const pact = book.pacts.find((row) => row.id === id);
  if (!pact || (pact.fromId !== user.id && pact.toId !== user.id)) notFound();
  const paying = user.id === pact.fromId;
  const working = user.id === pact.toId;

  return (
    <HouseFloor you={floorYou(user)}>
      <main className="app-page is-in-floor">
        <PageHead lead={`${pact.status} · ${formatCents(pact.priceCents)} USDT locked from the vault`} title={pact.title} />
        {query.e ? <p className="account-note">{query.e}</p> : null}
        <p className="account-note">
          {pact.kind === "company" ? "Company and employee" : "Client and developer"}.{" "}
          {book.names[pact.fromId] ?? "Client"} locked the price. {book.names[pact.toId] ?? "The other seat"} does the
          work. The terms below do not change. Vault USDT. Not a chain.
        </p>
        {lockLine(pact) ? <p className="account-note">{lockLine(pact)}</p> : null}
        <p>{pact.terms}</p>
        {pact.proof ? <p className="account-note">Proof: {pact.proof}</p> : null}
        {working && (pact.status === "offered" || pact.status === "accepted") ? (
          <form action={movePact}>
            <input name="pact" type="hidden" value={pact.id} />
            <input name="action" type="hidden" value="decline" />
            <HouseButton ghost type="submit">
              Decline and return the lock
            </HouseButton>
          </form>
        ) : null}
        {working && pact.status === "offered" ? (
          <form action={movePact}>
            <input name="pact" type="hidden" value={pact.id} />
            <input name="action" type="hidden" value="accept" />
            <HouseButton type="submit">Accept the terms</HouseButton>
          </form>
        ) : null}
        {working && pact.status === "accepted" ? (
          <form action={movePact} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
            <input name="pact" type="hidden" value={pact.id} />
            <input name="action" type="hidden" value="deliver" />
            <HouseField label="Proof" name="proof" required fullWidth multiline minRows={2} />
            <HouseButton type="submit">Deliver</HouseButton>
          </form>
        ) : null}
        {paying && pact.status === "delivered" ? (
          <form action={movePact}>
            <input name="pact" type="hidden" value={pact.id} />
            <input name="action" type="hidden" value="release" />
            <HouseButton type="submit">Release the lock</HouseButton>
          </form>
        ) : null}
        <p>
          <Link href="/contracts">All contracts</Link>
          {pact.companyId ? (
            <>
              {" · "}
              <Link href={`/companies/${pact.companyId}`}>Company</Link>
            </>
          ) : null}
        </p>
      </main>
    </HouseFloor>
  );
}
