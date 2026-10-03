"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HouseButton } from "@/components/HouseUi";
import { useCopy } from "@/components/LocaleRoot";
import { HOUSE_SEATS } from "@/lib/house-seats";
import { spokenSeat } from "@/lib/house-tongue";
import { LOCALES } from "@/lib/locale";

type OpenCircle = {
  id: string;
  kind: "craft" | "tongue";
  label: string;
  people: { id: string; username: string }[];
};

export function CircleRooms({ signedIn }: { signedIn: boolean }) {
  const { locale } = useCopy();
  const router = useRouter();
  const [circles, setCircles] = useState<OpenCircle[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    void fetch("/api/rooms/circle")
      .then((response) => response.json())
      .then((data: { circles?: OpenCircle[]; error?: string }) => {
        if (stop) return;
        if (data.error) throw new Error(data.error);
        setCircles(data.circles ?? []);
      })
      .catch((err) => {
        if (!stop) setError(err instanceof Error ? err.message : "Could not open rooms");
      });
    return () => {
      stop = true;
    };
  }, []);

  async function openRoom(id: string) {
    if (!signedIn) {
      router.push(`/signin?next=${encodeURIComponent(`/rooms/c/${id}`)}`);
      return;
    }
    setError("");
    const response = await fetch("/api/rooms/circle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "join", id }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error || "Could not open that room.");
      return;
    }
    router.push(`/rooms/c/${id}`);
  }

  return (
    <section className="hall-circles" aria-label="Rooms">
      <div className="lobby-row">
        <h2 className="lobby-label">Rooms</h2>
      </div>
      <p className="account-note">
        A seat can open a room for a craft or a language. An empty room is not listed. This room does not
        hold the pot. The pot stays on Classic.
      </p>
      {error ? <p className="error-toast">{error}</p> : null}
      {circles === null ? (
        <p className="account-note">Opening rooms…</p>
      ) : circles.length === 0 ? (
        <p className="account-note">No room is open. An empty room is not listed.</p>
      ) : (
        <ul className="house-posts">
          {circles.map((row) => (
            <li className="li-card house-post" key={row.id}>
              <p className="house-post-meta">
                <span>{row.kind === "craft" ? "Craft" : "Language"}</span>
                <span>
                  {row.people.length} {row.people.length === 1 ? "seat" : "seats"}
                </span>
              </p>
              <h2>
                <Link href={`/rooms/c/${row.id}`}>{row.label}</Link>
              </h2>
              <p>{row.people.map((person) => `@${person.username}`).join(" · ")}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Open a craft room">
        {HOUSE_SEATS.map((row) => (
          <HouseButton ghost key={row.id} onClick={() => void openRoom(`seat-${row.id}`)}>
            {spokenSeat(locale, row.id).tag}
          </HouseButton>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Open a language room">
        {LOCALES.map((row) => (
          <HouseButton ghost key={row.id} onClick={() => void openRoom(`lang-${row.id}`)}>
            {row.name}
          </HouseButton>
        ))}
      </div>
    </section>
  );
}
