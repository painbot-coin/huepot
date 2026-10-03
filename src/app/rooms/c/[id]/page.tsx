import { HouseButton } from "@/components/HouseUi";
import { CircleSit } from "@/components/CircleSit";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HouseFloor } from "@/components/HouseFloor";
import { getHeaderUser } from "@/lib/auth";
import { circleRoom } from "@/lib/circle-ledger";
import { circleOf } from "@/lib/circle-room";
import { floorYou } from "@/lib/house-you";
import { isHouseUser } from "@/lib/house";
import { withStoreRead } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const spec = circleOf(id);
  if (!spec) return { title: "Room" };
  return {
    title: spec.label,
    description: "A room for a craft or a language. It does not hold the pot.",
  };
}

export default async function CirclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const spec = circleOf(id);
  if (!spec) notFound();
  const user = await getHeaderUser();
  const room = await withStoreRead((store) => circleRoom(store, spec.id));
  if (!room) notFound();
  const you = user && !isHouseUser(user) ? user.id : "";
  const inside = room.people.some((person) => person.id === you);

  return (
    <HouseFloor kicker="Rooms" you={floorYou(user)}>
      <main className="app-page is-in-floor">
        <p className="hall-kicker">{room.kind === "craft" ? "Craft" : "Language"}</p>
        <h1 className="page-title">{room.label}</h1>
        <p className="app-lead">
          This room does not hold the pot. The pot stays on Classic.
          {room.people.length === 0 ? " An empty room is not listed." : ""}
        </p>
        {room.people.length === 0 ? (
          <p className="account-note">No seat is in this room yet.</p>
        ) : (
          <ul className="house-posts">
            {room.people.map((person) => (
              <li className="li-card house-post" key={person.id}>
                <h2>
                  <Link href={`/network/u/${encodeURIComponent(person.username)}`}>A seat · @{person.username}</Link>
                </h2>
              </li>
            ))}
          </ul>
        )}
        <CircleSit id={room.id} inside={inside} signedIn={Boolean(you)} />
        <p className="guide-cta">
          <HouseButton ghost href="/">
            Hall
          </HouseButton>
          <Link className="nav-link" href="/rooms/classic">
            Classic
          </Link>
        </p>
      </main>
    </HouseFloor>
  );
}
