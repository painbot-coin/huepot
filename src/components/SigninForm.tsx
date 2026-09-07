"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { MiniCoin } from "@/components/MiniCoin";
import { GoogleButton } from "@/components/GoogleButton";
import { CLASSIC_HOUR_UTC, FOG_CUP_HOUR_UTC, FOG_CUP_WEEKDAY } from "@/lib/config";
import { classicHourClock } from "@/lib/classic-hour";
import { fogCupClock } from "@/lib/fog-cup";

export function SigninForm() {
  const [error, setError] = useState("");
  const [age, setAge] = useState(false);
  const [ref, setRef] = useState("");
  const [sitNow, setSitNow] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("ref")?.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) ?? "";
    if (invite) setRef(invite);
    if (params.get("notice") === "google") {
      setError("Email sign-in is closed. Continue with Google.");
    }
    const value = params.get("error");
    if (!value) return;
    if (value === "google_not_configured") {
      setError("Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google login.");
      return;
    }
    if (value === "google_denied") {
      setError("Google sign-in was cancelled.");
      return;
    }
    setError(value);
  }, []);

  useEffect(() => {
    void fetch("/api/rooms")
      .then((response) => response.json() as Promise<{ classicHour?: { live?: boolean }; fogCup?: { live?: boolean } }>)
      .then((data) => {
        if (data.classicHour?.live) setSitNow("Classic hour is on.");
        else if (data.fogCup?.live) setSitNow("Fog cup is on.");
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="auth-card">
      <div className="auth-mark">
        <BrandMark className="brand-mark is-hero" />
        <div className="room-coin-row" aria-hidden="true">
          <MiniCoin id="crimson" />
          <MiniCoin id="azure" />
          <MiniCoin id="volt" />
          <MiniCoin id="amber" />
        </div>
      </div>
      <p className="hall-kicker">The gate</p>
      <h1 className="font-display text-4xl text-white">Enter the house</h1>
      <p className="app-lead">
        Google only. Tick 18+, then continue with the same Gmail you play with.
      </p>
      <p className="mt-3 text-sm text-zinc-500">
        Classic sits {classicHourClock(CLASSIC_HOUR_UTC)}. Fog cup{" "}
        {fogCupClock(FOG_CUP_WEEKDAY, FOG_CUP_HOUR_UTC)}.
      </p>
      {sitNow ? <p className="lobby-hour mt-2">{sitNow}</p> : null}
      <label className="mt-5 flex items-start gap-2 text-sm text-zinc-400">
        <input
          checked={age}
          className="mt-1"
          onChange={(event) => setAge(event.target.checked)}
          type="checkbox"
        />
        <span>
          I am 18 or older and agree to the{" "}
          <Link className="text-zinc-200 underline" href="/terms">
            terms
          </Link>
          .
        </span>
      </label>
      <div className="mt-5">
        <GoogleButton
          disabled={!age}
          href={ref ? `/api/auth/google?age=1&ref=${encodeURIComponent(ref)}` : "/api/auth/google?age=1"}
          label="Cross with Google"
        />
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {ref ? (
        <p className="mt-3 text-xs text-zinc-500">
          Invite code {ref} will tag this new Google account.
        </p>
      ) : null}
      {!age ? (
        <p className="empty-note">The gate opens after you tick 18+.</p>
      ) : null}
    </div>
  );
}
