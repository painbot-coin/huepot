"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function VerifyEmailClient() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<"idle" | "working" | "ok" | "error">(
    token ? "working" : "idle",
  );
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("huepot_verify_url");
    if (stored) setDevLink(stored);
    const fromQuery = params.get("dev");
    if (fromQuery) setDevLink(fromQuery);
  }, [params]);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error || "Verify failed");
        sessionStorage.removeItem("huepot_verify_url");
        setStatus("ok");
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Verify failed");
      }
    })();
  }, [token]);

  async function resend() {
    setMessage("");
    const response = await fetch("/api/auth/resend", { method: "POST" });
    const data = (await response.json()) as {
      error?: string;
      mailSent?: boolean;
      verifyUrl?: string;
    };
    if (!response.ok) {
      setMessage(data.error || "Could not resend");
      return;
    }
    if (data.verifyUrl) {
      setDevLink(data.verifyUrl);
      sessionStorage.setItem("huepot_verify_url", data.verifyUrl);
      setMessage("SMTP isn’t set, so here’s a local verify link.");
      return;
    }
    setMessage("Check your inbox for a new link.");
  }

  if (status === "working") {
    return <p className="text-zinc-400">Confirming your email…</p>;
  }

  if (status === "ok") {
    return (
      <div>
        <h1 className="font-display text-4xl text-white">Email verified</h1>
        <p className="mt-3 text-zinc-400">You can invest and play now.</p>
        <Link className="chip-btn mt-6 inline-flex" href="/invest">
          Go to invest
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-4xl text-white">Verify your email</h1>
      <p className="mt-3 text-zinc-400">
        We sent a link to your inbox. Click it, or resend if it hasn’t arrived.
      </p>
      {status === "error" ? (
        <p className="mt-4 text-sm text-red-300">{message}</p>
      ) : message ? (
        <p className="mt-4 text-sm text-zinc-300">{message}</p>
      ) : null}
      {devLink ? (
        <p className="mt-4 break-all text-sm text-zinc-400">
          Local verify link:{" "}
          <a className="text-zinc-200 underline" href={devLink}>
            {devLink}
          </a>
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="chip-btn" onClick={() => void resend()} type="button">
          Resend email
        </button>
        <Link className="chip-btn chip-btn-ghost" href="/">
          Back to play
        </Link>
      </div>
    </div>
  );
}
