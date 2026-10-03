"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HouseAlert, HouseButton } from "@/components/HouseUi";

export function CircleSit({
  id,
  signedIn,
  inside,
}: {
  id: string;
  signedIn: boolean;
  inside: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!signedIn) {
    return (
      <p className="guide-cta">
        <HouseButton href={`/signin?next=${encodeURIComponent(`/rooms/c/${id}`)}`}>
          Sign in to open this room
        </HouseButton>
      </p>
    );
  }

  async function send(action: "join" | "leave") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rooms/circle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not update this room.");
      if (action === "leave") router.push("/");
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this room.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error ? <HouseAlert>{error}</HouseAlert> : null}
      <p className="guide-cta">
        {inside ? (
          <HouseButton disabled={busy} ghost onClick={() => void send("leave")}>
            Leave
          </HouseButton>
        ) : (
          <HouseButton disabled={busy} onClick={() => void send("join")}>
            Open this room
          </HouseButton>
        )}
        <HouseButton ghost href="/rooms/classic">
          The pot stays on Classic
        </HouseButton>
      </p>
    </div>
  );
}
