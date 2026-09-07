import Link from "next/link";
import { LazyCreateRoomForm } from "@/components/LazyViews";
import { getHeaderUser } from "@/lib/auth";

export default async function NewRoomPage() {
  const user = await getHeaderUser();
  return (
    <main className="app-page">
      {!user ? (
        <div className="auth-card">
          <p className="hall-kicker">Raise a table</p>
          <h1 className="font-display text-3xl">Enter to open a table</h1>
          <p className="mt-2 text-zinc-400">
            Custom rooms are free to create. Cross the gate first.
          </p>
          <Link className="chip-btn mt-6 inline-flex" href="/signin">
            Enter the house
          </Link>
        </div>
      ) : !user.emailVerified ? (
        <div className="auth-card">
          <p className="hall-kicker">Raise a table</p>
          <h1 className="font-display text-3xl">Finish the gate</h1>
          <p className="mt-2 text-zinc-400">
            Tick 18+ and Cross with Google before you open a table.
          </p>
          <Link className="chip-btn mt-6 inline-flex" href="/signin">
            Cross the gate
          </Link>
        </div>
      ) : (
        <LazyCreateRoomForm />
      )}
    </main>
  );
}
