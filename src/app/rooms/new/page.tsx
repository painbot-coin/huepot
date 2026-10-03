import { HouseButton } from "@/components/HouseUi";
import Link from "next/link";
import { HouseFloor } from "@/components/HouseFloor";
import { floorYou } from "@/lib/house-you";
import { LazyCreateRoomForm } from "@/components/LazyViews";
import { getHeaderUser } from "@/lib/auth";

export default async function NewRoomPage() {
  const user = await getHeaderUser();
  return (
    <HouseFloor kicker="Raise a table" you={floorYou(user)}>
    <main className="app-page is-in-floor">
      {!user ? (
        <div className="auth-card">
          <p className="hall-kicker">Raise a table</p>
          <h1 className="font-display text-3xl">Enter to open a table</h1>
          <p className="mt-2 text-zinc-400">
            Custom rooms are free to create. Sign in first.
          </p>
          <HouseButton className="mt-6 inline-flex" href="/signin">
            Join Huepot
          </HouseButton>
        </div>
      ) : !user.emailVerified ? (
        <div className="auth-card">
          <p className="hall-kicker">Raise a table</p>
          <h1 className="font-display text-3xl">Finish sign-in</h1>
          <p className="mt-2 text-zinc-400">
            Tick 18+ and continue with Google before you open a table.
          </p>
          <HouseButton className="mt-6 inline-flex" href="/signin">
            Sign in
          </HouseButton>
        </div>
      ) : (
        <LazyCreateRoomForm />
      )}
    </main>
    </HouseFloor>
  );
}
