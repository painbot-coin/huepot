"use client";

import Link from "next/link";
import { useState } from "react";
import { inviteText } from "@/lib/invite-copy";
import type { GameState } from "@/lib/types";

export function ShareTake({
  path,
  line,
  fogName,
  canOpenFog,
  inviteCode,
  slug,
  hour,
  night,
  cup,
  buttonCount,
  clickPrice,
  roundSeconds,
}: {
  path: string;
  line: string;
  fogName: string;
  canOpenFog: boolean;
  inviteCode: string;
  slug: string;
  hour?: number | null;
  night?: number | null;
  cup?: { weekday: number; hour: number } | null;
  buttonCount: number;
  clickPrice: number;
  roundSeconds: number;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared">("idle");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "copied">("idle");
  const [fogBusy, setFogBusy] = useState(false);
  const [fogError, setFogError] = useState("");

  async function share() {
    const url = `${window.location.origin}${path}`;
    const text = `${line}.\n${url}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Huepot", text: line, url });
        setStatus("shared");
      } else {
        await navigator.clipboard.writeText(text);
        setStatus("copied");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(text);
        setStatus("copied");
      } catch {
        /* ignore */
      }
    }
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  async function copyInvite() {
    const url = inviteCode
      ? `${window.location.origin}/rooms/${slug}?ref=${inviteCode}`
      : `${window.location.origin}/rooms/${slug}`;
    const text = inviteCode
      ? inviteText(url, {
          hour: slug === "fog" ? null : hour,
          night: slug === "night" ? night : slug === "fog" ? null : night,
          cup,
        })
      : url;
    try {
      await navigator.clipboard.writeText(text);
      setInviteStatus("copied");
    } catch {
      /* ignore */
    }
    window.setTimeout(() => setInviteStatus("idle"), 1800);
  }

  async function openFog() {
    setFogBusy(true);
    setFogError("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fogName,
          buttonCount,
          clickPrice,
          roundSeconds,
          liveMinutes: 30,
          fog: true,
        }),
      });
      const data = (await response.json()) as GameState & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not open Fog");
      const nextSlug = data.room.slug;
      const next = inviteCode ? `/rooms/${nextSlug}?ref=${inviteCode}` : `/rooms/${nextSlug}`;
      const url = `${window.location.origin}${next}`;
      try {
        await navigator.clipboard.writeText(`${line}. Fog is open 30 minutes.\n${url}`);
      } catch {
        /* ignore */
      }
      window.location.assign(`/rooms/${nextSlug}`);
    } catch (err) {
      setFogError(err instanceof Error ? err.message : "Could not open Fog");
      setFogBusy(false);
    }
  }

  const label = status === "copied" ? "Copied" : status === "shared" ? "Shared" : "Share this take";

  return (
    <div className="take-share">
      <p className="take-share-line">{line}.</p>
      <p>
        <button className="take-share-btn" onClick={() => void share()} type="button">
          {label}
        </button>
        {" · "}
        {inviteCode ? (
          <button className="take-share-btn" onClick={() => void copyInvite()} type="button">
            {inviteStatus === "copied" ? "Invite copied" : "Copy invite"}
          </button>
        ) : (
          <Link href={`/signin?next=${encodeURIComponent(path)}`}>Sign in to copy invite</Link>
        )}
        {" · "}
        {canOpenFog ? (
          <button className="take-share-btn" disabled={fogBusy} onClick={() => void openFog()} type="button">
            {fogBusy ? "Opening Fog…" : "Open a 30-min Fog table"}
          </button>
        ) : (
          <Link href="/signin">Sign in to open Fog</Link>
        )}
      </p>
      {fogError ? <p className="mt-2 text-sm text-red-800">{fogError}</p> : null}
    </div>
  );
}
