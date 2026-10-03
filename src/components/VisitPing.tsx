"use client";

import { useEffect, useRef } from "react";

export function VisitPing() {
  const last = useRef("");

  useEffect(() => {
    function send(wantPulse: boolean) {
      if (document.visibilityState === "hidden") return;
      const path = window.location.pathname || "/";
      const pulse = wantPulse && path === last.current;
      void fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, pulse }),
      }).catch(() => undefined);
      last.current = path;
    }

    function onShow() {
      send(true);
    }

    send(false);
    const pulseId = window.setInterval(() => send(true), 45_000);
    const navId = window.setInterval(() => {
      if ((window.location.pathname || "/") !== last.current) send(false);
    }, 1_500);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      window.clearInterval(pulseId);
      window.clearInterval(navId);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, []);

  return null;
}
