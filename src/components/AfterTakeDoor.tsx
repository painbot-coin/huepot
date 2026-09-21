"use client";

import { useEffect, useState } from "react";
import { AfterTakeButton } from "@/components/AfterTakeButton";
import { isFreshTake } from "@/lib/after-take";

export function AfterTakeDoor({ at }: { at: number }) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    if (!isFreshTake(at)) return;
    void (async () => {
      try {
        const response = await fetch("/api/auth/me?lite=1");
        const data = (await response.json()) as { user?: { inviteCode?: string } | null };
        if (data.user) setInviteCode(data.user.inviteCode || "");
      } catch {
        /* stay closed */
      }
    })();
  }, [at]);

  if (!isFreshTake(at) || inviteCode == null) return null;

  return (
    <p className="app-actions">
      <AfterTakeButton inviteCode={inviteCode} />
      <span className="text-sm text-zinc-500">30 minutes of Fog. Company hears.</span>
    </p>
  );
}
