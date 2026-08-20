"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { GoogleButton } from "@/components/GoogleButton";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      const data = (await response.json()) as {
        error?: string;
        verifyUrl?: string;
      };
      if (!response.ok) throw new Error(data.error || "Signup failed");
      if (data.verifyUrl) {
        sessionStorage.setItem("huepot_verify_url", data.verifyUrl);
      }
      window.location.href = "/verify-email";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={(event) => void submit(event)}>
      <h1 className="font-display text-4xl text-white">Create account</h1>
      <p className="mt-2 text-zinc-400">
        We’ll email a verification link, then open deposit wallets on ETH,
        BEP-20, TRC-20, and the other networks.
      </p>
      <GoogleButton label="Continue with Google" />
      <p className="auth-split">or with email</p>
      <label className="mt-2 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
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
      <label className="mt-4 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Username
      </label>
      <input
        autoComplete="username"
        className="field"
        minLength={3}
        onChange={(event) => setUsername(event.target.value)}
        required
        value={username}
      />
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
      <button className="chip-btn mt-5 w-full justify-center" disabled={busy} type="submit">
        {busy ? "Creating…" : "Sign up"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      <p className="mt-5 text-sm text-zinc-500">
        Already have an account?{" "}
        <Link className="text-zinc-200 underline" href="/signin">
          Sign in
        </Link>
      </p>
    </form>
  );
}
