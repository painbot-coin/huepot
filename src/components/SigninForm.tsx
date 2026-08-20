"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { GoogleButton } from "@/components/GoogleButton";

export function SigninForm() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("error");
    if (!value) return;
    if (value === "google_not_configured") {
      setError("Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Gmail login.");
      return;
    }
    if (value === "google_denied") {
      setError("Google sign-in was cancelled.");
      return;
    }
    setError(value);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Sign in failed");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={(event) => void submit(event)}>
      <h1 className="font-display text-4xl text-white">Sign in</h1>
      <p className="mt-2 text-zinc-400">
        Use Gmail, or your email / username and password.
      </p>
      <GoogleButton label="Continue with Google" />
      <p className="auth-split">or with email</p>
      <label className="mt-2 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Email or username
      </label>
      <input
        autoComplete="username"
        className="field"
        onChange={(event) => setLogin(event.target.value)}
        required
        value={login}
      />
      <label className="mt-4 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Password
      </label>
      <input
        autoComplete="current-password"
        className="field"
        onChange={(event) => setPassword(event.target.value)}
        required
        type="password"
        value={password}
      />
      <button className="chip-btn mt-5 w-full justify-center" disabled={busy} type="submit">
        {busy ? "Signing in…" : "Sign in"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      <p className="mt-5 text-sm text-zinc-500">
        New here?{" "}
        <Link className="text-zinc-200 underline" href="/signup">
          Create an account
        </Link>
      </p>
    </form>
  );
}
