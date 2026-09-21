"use client";

import Link from "next/link";
import { useState } from "react";
import { CopyInvite } from "@/components/CopyInvite";
import type { BoardSitDoor } from "@/lib/board-sit";
import type { FogCup } from "@/lib/types";

export function BoardRowDoors({
  username,
  door,
  invite,
}: {
  username: string;
  door: BoardSitDoor;
  invite?: {
    code: string;
    hour?: number | null;
    night?: number | null;
    cup?: FogCup | null;
  } | null;
}) {
  const [sent, setSent] = useState(door.sent);
  const [busy, setBusy] = useState(false);

  async function ask() {
    setBusy(true);
    try {
      const response = await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", username }),
      });
      if (response.status === 401) {
        window.location.href = "/signin?next=/board";
        return;
      }
      if (!response.ok) throw new Error("ask");
      setSent(true);
    } catch {
      /* keep the ask */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="board-doors">
      <Link className="chip-btn chip-btn-ghost" href={door.sitHref}>
        {door.sitLabel}
      </Link>
      {door.ask && !sent ? (
        <button className="li-ask" disabled={busy} onClick={() => void ask()} type="button">
          Ask
        </button>
      ) : null}
      {sent ? <span className="li-ask is-sent">Sent</span> : null}
      {invite?.code ? (
        <CopyInvite
          className="chip-btn chip-btn-ghost"
          code={invite.code}
          cup={invite.cup}
          hour={invite.hour}
          href="/rooms/classic"
          night={invite.night}
        />
      ) : null}
    </div>
  );
}
