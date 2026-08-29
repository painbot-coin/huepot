"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string; resetUrl?: string };
      if (!response.ok) throw new Error(data.error || "Could not send reset");
      if (data.resetUrl) {
        window.location.href = data.resetUrl;
        return;
      }
      setMessage("If that email has a password, we sent a reset link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={(event) => void submit(event)}>
      <h1 className="font-display text-4xl text-white">Reset password</h1>
      <p className="mt-2 text-zinc-400">We’ll email a one-hour link if the account uses a password.</p>
      <label className="mt-4 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Email
      </label>
      <input
        autoComplete="email"
        className="field"
        onChange={(event) => setEmail(event.target.value)}
        required
        type="email"
        value={email}
      />
      <button className="chip-btn mt-5 w-full justify-center" disabled={busy} type="submit">
        {busy ? "Sending…" : "Send link"}
      </button>
      {message ? <p className="mt-3 text-sm text-zinc-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      <p className="mt-5 text-sm text-zinc-500">
        <Link className="text-zinc-200 underline" href="/signin">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
