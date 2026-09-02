import Link from "next/link";
import { LazyCreateRoomForm } from "@/components/LazyViews";
import { getHeaderUser } from "@/lib/auth";

export default async function NewRoomPage() {
  const user = await getHeaderUser();
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      {!user ? (
        <div className="auth-card">
          <h1 className="font-display text-3xl">Sign in to open a table</h1>
          <p className="mt-2 text-zinc-400">
            Custom rooms are free to create. You need an account first.
          </p>
          <Link className="chip-btn mt-6 inline-flex" href="/signin">
            Sign in
          </Link>
        </div>
      ) : !user.emailVerified ? (
        <div className="auth-card">
          <h1 className="font-display text-3xl">Sign in with Google</h1>
          <p className="mt-2 text-zinc-400">
            Custom rooms need a Google account before you set coins, price, and
            round time.
          </p>
          <Link className="chip-btn mt-6 inline-flex" href="/signin">
            Sign in
          </Link>
        </div>
      ) : (
        <LazyCreateRoomForm />
      )}
    </main>
  );
}
