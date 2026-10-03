"use client";

import { useState } from "react";
import { HouseFloor, type HouseYou } from "@/components/HouseFloor";
import { useCopy } from "@/components/LocaleRoot";
import { afterSeatPath } from "@/lib/classic-sit";
import { HOUSE_SEATS } from "@/lib/house-seats";
import { seatLead, seatTitle, spokenSeat } from "@/lib/house-tongue";

export function SeatPick({ next = "", you }: { next?: string; you?: HouseYou | null }) {
  const { locale } = useCopy();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function pick(seat: string) {
    setBusy(seat);
    setError("");
    try {
      const response = await fetch("/api/network/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seat }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not save your role");
      window.location.href = afterSeatPath(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your role");
    } finally {
      setBusy("");
    }
  }

  return (
    <HouseFloor kicker="Your role" you={you}>
    <main className="app-page is-seat is-in-floor">
      <p className="hall-kicker">Your role</p>
      <h1 className="font-display text-4xl text-white">{seatTitle(locale)}</h1>
      <p className="app-lead">{seatLead(locale)}</p>
      <ul className="seat-pick">
        {HOUSE_SEATS.map((row) => {
          const face = spokenSeat(locale, row.id);
          return (
          <li key={row.id}>
            <button
              disabled={Boolean(busy)}
              onClick={() => void pick(row.id)}
              type="button"
            >
              <strong>{face.tag}</strong>
              <em>{face.label}</em>
              <p>{face.who}</p>
            </button>
          </li>
          );
        })}
      </ul>
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
    </main>
    </HouseFloor>
  );
}
