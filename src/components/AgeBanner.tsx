"use client";

import { useState } from "react";

export function AgeBanner() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "age" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not confirm");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm");
      setBusy(false);
    }
  }

  return (
    <div className="verify-banner">
      <p>Huepot is 18+. Confirm your age to invest and click.</p>
      <button disabled={busy} onClick={() => void confirm()} type="button">
        {busy ? "Saving…" : "I am 18+"}
      </button>
      {error ? <span>{error}</span> : null}
    </div>
  );
}
