"use client";

import { useEffect } from "react";

export function RefCookie() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search)
      .get("ref")
      ?.trim()
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 12);
    if (!code || code.length < 4) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `huepot_ref=${encodeURIComponent(code)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`;
  }, []);
  return null;
}
