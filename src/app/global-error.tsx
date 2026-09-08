"use client";

/**
 * The root layout itself failed, so this replaces it — html and body included.
 * Deliberately styled inline and importing nothing: the one page that must
 * render when everything else in the app is broken cannot depend on the app.
 */

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b0b10",
          color: "#e7e7ee",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "34rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.72rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#ffd27a",
            }}
          >
            Huepot
          </p>
          <h1 style={{ margin: "0.35rem 0 0", fontSize: "2rem", fontWeight: 600 }}>
            The house is shut for a moment
          </h1>
          <p style={{ color: "#a3a3b2", lineHeight: 1.6 }}>
            Something failed before the page could be built. Nothing has been
            taken and no round is affected — balances only move on a request
            that completes.
          </p>
          <p>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                background: "#ffd27a",
                color: "#161019",
                border: 0,
                padding: "0.6rem 1.1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </p>
          {error.digest ? (
            <p style={{ color: "#6b6b7b", fontSize: "0.85rem" }}>
              Reference {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
