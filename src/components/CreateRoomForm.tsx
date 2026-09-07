"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  FOG_SECONDS,
  LIVE_MINUTE_OPTIONS,
  MAX_BUTTONS,
  MAX_CLICK_PRICE,
  MAX_ROUND_SECONDS,
  MIN_BUTTONS,
  MIN_CLICK_PRICE,
  MIN_ROUND_SECONDS,
} from "@/lib/config";
import type { GameState } from "@/lib/types";

export function CreateRoomForm({
  onCreated,
}: {
  onCreated?: (slug: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [buttonCount, setButtonCount] = useState(4);
  const [clickPrice, setClickPrice] = useState(1);
  const [roundSeconds, setRoundSeconds] = useState(60);
  const [liveMinutes, setLiveMinutes] = useState(60);
  const [fog, setFog] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, buttonCount, clickPrice, roundSeconds, liveMinutes, fog }),
      });
      const data = (await response.json()) as GameState & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not create room");
      if (onCreated) onCreated(data.room.slug);
      else router.push(`/rooms/${data.room.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room");
      setBusy(false);
    }
  }

  return (
    <form className="create-room" onSubmit={(event) => void submit(event)}>
      <header className="create-room-head">
        <div>
          <p className="create-room-kicker">Raise a table</p>
          <h1 className="font-display create-room-title">Open a table</h1>
        </div>
        <p className="create-room-lead">
          A guest door in the house. No fee. It falls when live time ends.
        </p>
      </header>

      <div className="create-room-body">
        <label className="create-field">
          <span>Room name</span>
          <input
            className="field"
            maxLength={28}
            minLength={3}
            onChange={(event) => setName(event.target.value)}
            placeholder="My fog table"
            required
            value={name}
          />
        </label>

        <div className="create-grid">
          <label className="create-field">
            <span>Coins ({MIN_BUTTONS}–{MAX_BUTTONS})</span>
            <input
              className="field"
              max={MAX_BUTTONS}
              min={MIN_BUTTONS}
              onChange={(event) => setButtonCount(Number(event.target.value))}
              required
              type="number"
              value={buttonCount}
            />
          </label>
          <label className="create-field">
            <span>Click USDT</span>
            <input
              className="field"
              max={MAX_CLICK_PRICE}
              min={MIN_CLICK_PRICE}
              onChange={(event) => setClickPrice(Number(event.target.value))}
              required
              step="0.1"
              type="number"
              value={clickPrice}
            />
          </label>
          <label className="create-field">
            <span>Round sec</span>
            <input
              className="field"
              max={MAX_ROUND_SECONDS}
              min={MIN_ROUND_SECONDS}
              onChange={(event) => setRoundSeconds(Number(event.target.value))}
              required
              type="number"
              value={roundSeconds}
            />
          </label>
          <label className="create-field">
            <span>Live time</span>
            <select
              className="field"
              onChange={(event) => setLiveMinutes(Number(event.target.value))}
              value={liveMinutes}
            >
              {LIVE_MINUTE_OPTIONS.map((mins) => (
                <option key={mins} value={mins}>
                  {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="fog-check">
          <input
            checked={fog}
            onChange={(event) => setFog(event.target.checked)}
            type="checkbox"
          />
          <span>
            Fog last {FOG_SECONDS}s
            <small>Public counts go dark. Your clicks stay visible.</small>
          </span>
        </label>

        {error ? <p className="error-toast create-room-error">{error}</p> : null}
      </div>

      <footer className="create-room-actions">
        <button className="chip-btn create-room-submit" disabled={busy} type="submit">
          {busy ? "Opening…" : "Open the table"}
        </button>
      </footer>
    </form>
  );
}
