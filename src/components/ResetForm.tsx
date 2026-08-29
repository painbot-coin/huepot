"use client";

import { useEffect, useState, type FormEvent } from "react";

export function ResetForm() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not reset");
      window.location.href = "/signin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset");
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={(event) => void submit(event)}>
      <h1 className="font-display text-4xl text-white">New password</h1>
      <p className="mt-2 text-zinc-400">Pick at least 8 characters. Other devices will be signed out.</p>
      <label className="mt-4 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Password
      </label>
      <input
        autoComplete="new-password"
        className="field"
        minLength={8}
        onChange={(event) => setPassword(event.target.value)}
        required
        type="password"
        value={password}
      />
      <button className="chip-btn mt-5 w-full justify-center" disabled={busy || !token} type="submit">
        {busy ? "Saving…" : "Save password"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </form>
  );
}
