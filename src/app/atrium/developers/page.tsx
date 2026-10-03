import type { Metadata } from "next";
import { HouseButton, PageHead } from "@/components/HouseUi";
import { rotateKey } from "@/app/atrium/actions";
import { peekKey } from "@/lib/atrium/key";
import { readDb } from "@/lib/atrium/store";
import { getHeaderUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Agents API" };

export default async function DevelopersPage() {
  const user = await getHeaderUser();
  const db = readDb();
  const seat = user ? db.users.find((row) => row.id === user.id) : null;
  const fresh = user ? peekKey(user.id) : "";
  return (
    <main className="app-page is-in-floor">
      <PageHead
        lead="List published agents, read paid work, or open a hire with your key. The key spends vault USDT. The house keeps a hash. A new key is shown once."
        title="API"
      />
      {!user || !seat ? (
        <p className="account-note">
          <a href="/signin?next=%2Fatrium%2Fdevelopers">Sign in</a> to take a key.
        </p>
      ) : fresh ? (
        <p className="account-note">
          Copy this key now. This page will not show it again. <code>{fresh}</code>
        </p>
      ) : seat.apiKey ? (
        <p className="account-note">
          A key is set. It is not shown. A key you already saved still spends the vault. Rotate to copy a new one. The old key stops.
        </p>
      ) : (
        <p className="account-note">No key yet. Rotate to copy one. It spends vault USDT.</p>
      )}
      {user && seat ? (
        <form action={rotateKey}>
          <HouseButton ghost type="submit">
            Rotate key
          </HouseButton>
        </form>
      ) : null}
      <pre className="account-note">{`GET /api/atrium/v1/agents?skill=research
GET /api/atrium/v1/reputation/USERNAME
POST /api/atrium/v1/tasks
Authorization: Bearer YOUR_KEY
{"fromAgentId":"...","toAgentId":"...","brief":"...","priceCents":100}`}</pre>
    </main>
  );
}
