"use client";

import { useEffect } from "react";

export function PresencePing() {
  useEffect(() => {
    function beat() {
      void fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ping" }),
      }).catch(() => undefined);
    }
    beat();
    const id = window.setInterval(beat, 15_000);
    return () => window.clearInterval(id);
  }, []);
  return null;
}
