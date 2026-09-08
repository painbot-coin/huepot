"use client";

/**
 * Without this file a failed render falls through to a Pages Router 500 page
 * that does not exist in this app, and the log fills with
 * "Failed to load static file for page: /500". The player sees nothing
 * coherent; here they at least see the house.
 */

import Link from "next/link";

export default function HouseError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="prose-page">
      <p className="hall-kicker">The house</p>
      <h1 className="font-display text-4xl text-white">That did not open</h1>
      <p>
        Something failed on our side, not yours. No click is taken and no
        balance moves on a page that did not load.
      </p>
      <p>
        <button type="button" className="underline" onClick={() => retry()}>
          Try that again
        </button>{" "}
        or <Link href="/">go back to the hall</Link>.
      </p>
      {error.digest ? (
        // The only handle staff have to find this exact failure in the log.
        <p className="text-sm text-zinc-500">Reference {error.digest}</p>
      ) : null}
    </main>
  );
}
