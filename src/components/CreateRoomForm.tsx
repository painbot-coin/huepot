"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
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
        body: JSON.stringify({ name, buttonCount, clickPrice, roundSeconds, liveMinutes }),
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
    <form className="auth-card create-room" onSubmit={(event) => void submit(event)}>
      <h1 className="font-display text-3xl">Open a table</h1>
      <p className="mt-2 text-zinc-400">
        No create fee. Set coins, click price, round clock, and how long this
        table stays live. When live time ends, the room is deleted.
      </p>
      <label className="mt-5 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Room name
        <input
          className="field"
          maxLength={28}
          minLength={3}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </label>
      <label className="mt-4 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Coin buttons ({MIN_BUTTONS}–{MAX_BUTTONS})
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
      <label className="mt-4 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Click price in USDT ({MIN_CLICK_PRICE}–{MAX_CLICK_PRICE})
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
      <label className="mt-4 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Round seconds ({MIN_ROUND_SECONDS}–{MAX_ROUND_SECONDS})
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
      <label className="mt-4 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Table live time
        <select
          className="field"
          onChange={(event) => setLiveMinutes(Number(event.target.value))}
          value={liveMinutes}
        >
          {LIVE_MINUTE_OPTIONS.map((mins) => (
            <option key={mins} value={mins}>
              {mins < 60 ? `${mins} minutes` : `${mins / 60} hour${mins === 60 ? "" : "s"}`} — then delete
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="error-toast mt-4">{error}</p> : null}
      <button className="chip-btn mt-6" disabled={busy} type="submit">
        {busy ? "Opening…" : "Open room"}
      </button>
    </form>
  );
}
