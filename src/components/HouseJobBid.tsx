"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HouseAlert, HouseButton, HouseField } from "@/components/HouseUi";
import { NOTE_MAX } from "@/lib/house-jobs";

type Yours = {
  note: string;
  href: string;
  createdAt: number;
};

export function HouseJobBid({
  jobId,
  signedIn,
  next,
  yours,
}: {
  jobId: string;
  signedIn: boolean;
  next: string;
  yours: Yours | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState(yours?.note ?? "");
  const [href, setHref] = useState(yours?.href ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!signedIn) {
    return (
      <p className="guide-cta">
        <HouseButton href={`/signin?next=${encodeURIComponent(next)}`}>
          Sign in to apply
        </HouseButton>
        <Link className="nav-link" href="/jobs">
          All jobs
        </Link>
      </p>
    );
  }

  async function send(method: "POST" | "DELETE") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
        method,
        headers: method === "POST" ? { "content-type": "application/json" } : undefined,
        body: method === "POST" ? JSON.stringify({ note, href }) : undefined,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not send that application.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that application.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="house-bid"
      onSubmit={(event) => {
        event.preventDefault();
        void send("POST");
      }}
    >
      <HouseField
        label="How you would do this job"
        maxLength={NOTE_MAX}
        multiline
        onChange={(event) => setNote(event.target.value)}
        required
        rows={5}
        value={note}
      />
      <HouseField
        label="Portfolio link, if you have one"
        onChange={(event) => setHref(event.target.value)}
        placeholder="https://"
        type="url"
        value={href}
      />
      {yours ? (
        <p className="house-bid-had">You already applied. Submit again to replace it.</p>
      ) : null}
      {error ? <HouseAlert>{error}</HouseAlert> : null}
      <p className="guide-cta">
        <HouseButton disabled={busy} type="submit">
          {yours ? "Update application" : "Apply"}
        </HouseButton>
        {yours ? (
          <HouseButton disabled={busy} ghost onClick={() => void send("DELETE")}>
            Withdraw application
          </HouseButton>
        ) : null}
        <Link className="nav-link" href="/jobs">
          All jobs
        </Link>
      </p>
    </form>
  );
}
