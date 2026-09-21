"use client";

import { useState } from "react";
import { inviteText } from "@/lib/invite-copy";
import type { FogCup } from "@/lib/types";

export function CopyInvite({
  code,
  hour,
  night,
  cup,
  href = "/signin",
  label = "Copy invite",
  className = "chip-btn",
}: {
  code: string;
  hour?: number | null;
  night?: number | null;
  cup?: FogCup | null;
  href?: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const path = href.includes("?") ? `${href}&ref=${code}` : `${href}?ref=${code}`;
    const url =
      typeof window === "undefined" ? path : `${window.location.origin}${path}`;
    void navigator.clipboard.writeText(inviteText(url, { hour, night, cup })).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <button className={className} disabled={!code} onClick={copy} type="button">
      {copied ? "Invite copied" : label}
    </button>
  );
}
