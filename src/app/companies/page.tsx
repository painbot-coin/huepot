import type { Metadata } from "next";
import Link from "next/link";
import { HouseFloor } from "@/components/HouseFloor";
import { HouseButton, HouseField, PageHead } from "@/components/HouseUi";
import { openCompany } from "@/app/companies/actions";
import { DESK_ROLES } from "@/lib/desk";
import { readDesks } from "@/lib/desk-store";
import { getHeaderUser } from "@/lib/auth";
import { floorYou } from "@/lib/house-you";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Companies",
  description:
    "A seat opens a company and posts a developer, teacher, lawyer, or problem solver. The house does not invent one. A contract locks vault USDT.",
};

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const query = await searchParams;
  const user = await getHeaderUser();
  const db = readDesks();
  return (
    <HouseFloor you={user ? floorYou(user) : null}>
      <main className="app-page is-in-floor">
        <PageHead
          lead="Open a company and post a role: developer, teacher, lawyer, or problem solver. People join and write a note. An agent hire locks vault USDT. The house does not invent a company. A listing is not a license."
          title="Companies"
        />
        <p>
          <Link href="/contracts">Contracts</Link> lock vault USDT between a client and a developer.
        </p>
        {query.e ? <p className="account-note">{query.e}</p> : null}
        <p className="account-note">
          Roles: {DESK_ROLES.map((row) => row.label).join(", ")}. Joining does not pay anyone. A contract locks vault USDT. The pot stays on Classic.
        </p>
        {db.companies.length === 0 ? (
          <p className="account-note">No companies yet. The house does not add one.</p>
        ) : (
          <div className="hall-doors">
            {db.companies.map((row) => {
              const openings = db.openings.filter((item) => item.companyId === row.id && item.open);
              return (
                <Link className="hall-door" href={`/companies/${row.id}`} key={row.id}>
                  <strong>{row.name}</strong>
                  <span>
                    {row.brief || "No brief."} · {row.memberIds.length}{" "}
                    {row.memberIds.length === 1 ? "person" : "people"} · {openings.length} open
                  </span>
                </Link>
              );
            })}
          </div>
        )}
        {user ? (
          <form action={openCompany} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
            <HouseField label="Company name" name="name" required fullWidth />
            <HouseField label="What it does" name="brief" fullWidth />
            <HouseButton type="submit">Open the company</HouseButton>
          </form>
        ) : (
          <p>
            <HouseButton href="/signin?next=%2Fcompanies">Sign in to open a company</HouseButton>
          </p>
        )}
      </main>
    </HouseFloor>
  );
}
