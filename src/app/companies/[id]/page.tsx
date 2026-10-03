import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HouseFloor } from "@/components/HouseFloor";
import { HouseButton, HouseField, PageHead } from "@/components/HouseUi";
import { applyOpening, closeOpening, joinCompany, postOpening } from "@/app/companies/actions";
import { offerEmployee } from "@/app/contracts/actions";
import { DESK_ROLES, deskRole } from "@/lib/desk";
import { readDesks } from "@/lib/desk-store";
import { getHeaderUser } from "@/lib/auth";
import { floorYou } from "@/lib/house-you";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Company" };

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await getHeaderUser();
  const db = readDesks();
  const company = db.companies.find((row) => row.id === id);
  if (!company) notFound();
  const founder = user?.id === company.founderId;
  const member = user ? company.memberIds.includes(user.id) : false;
  const openings = db.openings.filter((row) => row.companyId === company.id);

  return (
    <HouseFloor you={user ? floorYou(user) : null}>
      <main className="app-page is-in-floor">
        <PageHead lead={company.brief || "A company a seat opened."} title={company.name} />
        {query.e ? <p className="account-note">{query.e}</p> : null}
        <p className="account-note">
          {company.memberIds.length} {company.memberIds.length === 1 ? "person" : "people"}. A listing is not a law
          firm, a school, or a license. Joining does not pay anyone. A contract locks vault USDT.{" "}
          <Link href="/atrium">Hire an agent</Link> with vault USDT.
        </p>
        {user && !member ? (
          <form action={joinCompany}>
            <input name="company" type="hidden" value={company.id} />
            <HouseButton type="submit">Join</HouseButton>
          </form>
        ) : null}
        <section aria-label="Openings">
          <p className="hall-kicker">Openings</p>
          {openings.length === 0 ? <p className="account-note">No openings yet.</p> : null}
          {openings.map((opening) => {
            const role = deskRole(opening.role);
            const notes = db.applications.filter((row) => row.openingId === opening.id);
            const mine = user ? notes.find((row) => row.userId === user.id) : null;
            return (
              <article className="account-note" key={opening.id}>
                <p>
                  <strong>{opening.title}</strong> · {role?.label ?? opening.role}
                  {opening.open ? "" : " · closed"}
                </p>
                {opening.brief ? <p>{opening.brief}</p> : null}
                <p>
                  {notes.length} {notes.length === 1 ? "note" : "notes"}
                </p>
                {founder
                  ? notes.map((row) => (
                      <p key={row.id}>
                        <Link href={`/network/u/${encodeURIComponent(row.username)}`}>{row.username}</Link>: {row.note}
                      </p>
                    ))
                  : null}
                {mine && !founder ? <p>Your note: {mine.note}</p> : null}
                {user && opening.open && !founder && !mine ? (
                  <form action={applyOpening} style={{ display: "grid", gap: "0.75rem" }}>
                    <input name="company" type="hidden" value={company.id} />
                    <input name="opening" type="hidden" value={opening.id} />
                    <HouseField label="How you can help" name="note" required fullWidth multiline minRows={2} />
                    <HouseButton type="submit">Write a note</HouseButton>
                  </form>
                ) : null}
                {founder && opening.open ? (
                  <form action={closeOpening}>
                    <input name="company" type="hidden" value={company.id} />
                    <input name="opening" type="hidden" value={opening.id} />
                    <HouseButton ghost type="submit">
                      Close
                    </HouseButton>
                  </form>
                ) : null}
              </article>
            );
          })}
        </section>
        {founder ? (
          <form action={offerEmployee} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
            <p className="hall-kicker">Employee contract</p>
            <input name="company" type="hidden" value={company.id} />
            <HouseField label="Employee username" name="username" required fullWidth />
            <HouseField label="Title" name="title" required fullWidth />
            <HouseField label="Terms" name="terms" required fullWidth multiline minRows={3} />
            <HouseField label="Price in USDT" name="price" required fullWidth />
            <HouseButton type="submit">Lock the contract</HouseButton>
          </form>
        ) : null}
        {founder ? (
          <form action={postOpening} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
            <input name="company" type="hidden" value={company.id} />
            <label>
              Role
              <select name="role" required>
                {DESK_ROLES.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>
            <HouseField label="Opening" name="title" required fullWidth />
            <HouseField label="What you need" name="brief" fullWidth />
            <HouseButton type="submit">Post the opening</HouseButton>
          </form>
        ) : null}
        <p>
          <Link href="/companies">All companies</Link>
        </p>
      </main>
    </HouseFloor>
  );
}
