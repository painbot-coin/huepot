"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HouseAlert, HouseButton, HouseField } from "@/components/HouseUi";

export function JobDeskShare({ signedIn, seat }: { signedIn: boolean; seat: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [how, setHow] = useState("");
  const [href, setHref] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!signedIn) {
    return (
      <p className="guide-cta">
        <HouseButton href="/signin?next=/jobs">Sign in to share a project</HouseButton>
      </p>
    );
  }

  async function send() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/wait/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, how, href, seat, priceCents: 0 }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not share that project.");
      setName("");
      setHow("");
      setHref("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share that project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="house-bid"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <HouseField label="Project" onChange={(event) => setName(event.target.value)} required value={name} />
      <HouseField
        label="How it sits"
        multiline
        onChange={(event) => setHow(event.target.value)}
        required
        rows={3}
        value={how}
      />
      <HouseField
        label="Door"
        onChange={(event) => setHref(event.target.value)}
        placeholder="https://"
        required
        type="url"
        value={href}
      />
      <p className="account-note">USDT is not a wage. Gold is not a milestone.</p>
      {!seat ? (
        <p className="account-note">
          <a href="/seat">Pick a role</a> before this desk can keep the project.
        </p>
      ) : null}
      {error ? <HouseAlert>{error}</HouseAlert> : null}
      <p className="guide-cta">
        <HouseButton disabled={busy} type="submit">
          Share a project
        </HouseButton>
      </p>
    </form>
  );
}
