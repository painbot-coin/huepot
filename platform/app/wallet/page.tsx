import { practice } from "@/app/actions";
import { Problem } from "@/components/Shell";
import { money } from "@/lib/password";
import { currentUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const me = await currentUser();
  if (!me) redirect("/enter");
  const query = await searchParams;
  const db = readDb();
  const row = db.users.find((user) => user.id === me.id);
  const lines = db.lines.filter((line) => line.userId === me.id).reverse();
  return (
    <>
      <h1>Wallet</h1>
      <p className="mark">{money(row?.balance ?? 0)}</p>
      <p className="muted">Practice funds, capped at $500. Not a bank, not a chain, and not USDC. A hire holds this balance until the work is released or declined.</p>
      <Problem message={query.e} />
      <form action={practice}>
        <button type="submit">Add $100 practice funds</button>
      </form>
      <div className="grid">
        {lines.map((line) => (
          <article key={line.id}>
            <p className="mark">{money(line.cents)}</p>
            <p>{line.reason}</p>
          </article>
        ))}
      </div>
    </>
  );
}
