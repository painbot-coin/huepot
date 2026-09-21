"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { MiniCoin } from "@/components/MiniCoin";
import { GoogleButton } from "@/components/GoogleButton";
import { CLASSIC_HOUR_UTC, FOG_CUP_HOUR_UTC, FOG_CUP_WEEKDAY, NIGHT_HOUR_UTC } from "@/lib/config";
import { classicHourClock } from "@/lib/classic-hour";
import { fogCupClock } from "@/lib/fog-cup";
import { cupSendsToFog, hourSendsToClassic, hourSendsToNight } from "@/lib/hour-door";
import { nightHourClock } from "@/lib/night-hour";
import { safeNext } from "@/lib/next-path";
import type { ClassicHour, FogCup, NightHour } from "@/lib/types";

function googleHref(ref: string, next: string) {
  const params = new URLSearchParams({ age: "1" });
  if (ref) params.set("ref", ref);
  if (next) params.set("next", next);
  return `/api/auth/google?${params.toString()}`;
}

export function SigninForm() {
  const [error, setError] = useState("");
  const [age, setAge] = useState(false);
  const [ref, setRef] = useState("");
  const [next, setNext] = useState("");
  const [sitNow, setSitNow] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("ref")?.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) ?? "";
    if (invite) setRef(invite);
    setNext(safeNext(params.get("next") ?? ""));
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
      .then(
        (response) =>
          response.json() as Promise<{
            classicHour?: ClassicHour;
            nightHour?: NightHour;
            fogCup?: FogCup;
          }>,
      )
      .then((data) => {
        if (data.classicHour?.live) setSitNow("Classic hour is on.");
        else if (hourSendsToClassic(data.classicHour)) setSitNow("Classic hour soon.");
        else if (data.nightHour?.live) setSitNow("Night hour is on.");
        else if (hourSendsToNight(data.nightHour)) setSitNow("Night hour soon.");
        else if (data.fogCup?.live) setSitNow("Fog cup is on.");
        else if (cupSendsToFog(data.fogCup)) setSitNow("Fog cup soon.");
        const existing = safeNext(new URLSearchParams(window.location.search).get("next") ?? "");
        if (!existing && hourSendsToClassic(data.classicHour)) {
          setNext("/rooms/classic");
        } else if (!existing && hourSendsToNight(data.nightHour)) {
          setNext("/rooms/night");
        } else if (!existing && cupSendsToFog(data.fogCup)) {
          setNext("/rooms/fog");
        }
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
        Classic sits {classicHourClock(CLASSIC_HOUR_UTC)}. Night sits{" "}
        {nightHourClock(NIGHT_HOUR_UTC)}. Fog cup{" "}
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
          href={googleHref(ref, next)}
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
