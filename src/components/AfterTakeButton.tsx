"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteText } from "@/lib/invite-copy";
import type { GameState } from "@/lib/types";

export function AfterTakeButton({
  inviteCode = "",
}: {
  inviteCode?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("Sit this with company");

  async function open() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afterTake: true }),
      });
      const data = (await response.json()) as GameState & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not open that table.");
      const slug = data.room.slug;
      const code = inviteCode || data.user?.inviteCode || "";
      const url = `${window.location.origin}/rooms/${slug}${code ? `?ref=${code}` : ""}`;
      await navigator.clipboard.writeText(inviteText(url)).catch(() => undefined);
      setLabel("Invite copied · Fog");
      router.push(`/rooms/${slug}`);
    } catch (err) {
      setLabel(err instanceof Error ? err.message : "Could not open that table.");
      setBusy(false);
    }
  }

  return (
    <button className="chip-btn" disabled={busy} onClick={() => void open()} type="button">
      {label}
    </button>
  );
}
