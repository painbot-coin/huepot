"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GoogleButton } from "@/components/GoogleButton";

export function SigninForm() {
  const [error, setError] = useState("");
  const [age, setAge] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("error");
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

  return (
    <div className="auth-card">
      <h1 className="font-display text-4xl text-white">Sign in</h1>
      <p className="mt-2 text-zinc-400">
        Huepot uses Google only. Tick 18+, then continue with the same Gmail you
        play with.
      </p>
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
          href="/api/auth/google?age=1"
          label="Continue with Google"
        />
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {!age ? (
        <p className="mt-3 text-xs text-zinc-500">Tick 18+ to continue.</p>
      ) : null}
    </div>
  );
}
