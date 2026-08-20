"use client";

import { useState } from "react";

export function VerifyBanner({ email }: { email: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/resend", { method: "POST" });
      const data = (await response.json()) as {
        error?: string;
        mailSent?: boolean;
        verifyUrl?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not resend");
      if (data.verifyUrl) {
        setMessage("Mail isn’t configured yet. Use the verify page link.");
        window.location.href = `/verify-email?dev=${encodeURIComponent(data.verifyUrl)}`;
        return;
      }
      setMessage(`Sent to ${email}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not resend");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="verify-banner">
      <p>
        Confirm <strong>{email}</strong> to invest, click, and withdraw.{" "}
        <a href="/verify-email">Open verify page</a>
      </p>
      <button disabled={busy} onClick={() => void resend()} type="button">
        {busy ? "Sending…" : "Resend email"}
      </button>
      {message ? <span>{message}</span> : null}
    </div>
  );
}
