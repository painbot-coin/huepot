"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HouseButton, HouseChip, HouseField } from "@/components/HouseUi";
import { PAGE } from "@/lib/voice";

export type ManageApp = {
  id: string;
  jobId: string;
  title: string;
  username: string;
  seat: string;
  note: string;
  href: string;
  createdAt: number;
  status: "open" | "shortlist" | "passed";
};

function ago(at: number) {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function ManageDesk({
  applications,
  managers,
  focus = "",
  you = "",
}: {
  applications: ManageApp[];
  managers: string[];
  focus?: string;
  you?: string;
}) {
  const [rows, setRows] = useState(applications);
  const [desk, setDesk] = useState(managers);
  const [filter, setFilter] = useState<"all" | "open" | "shortlist" | "passed">("all");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const shown = useMemo(() => {
    const list = filter === "all" ? rows : rows.filter((row) => row.status === filter);
    if (!focus) return list;
    return [...list].sort((a, b) => Number(b.id === focus) - Number(a.id === focus));
  }, [filter, focus, rows]);

  async function act(body: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/manage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        error?: string;
        applications?: ManageApp[];
        managers?: string[];
      };
      if (!res.ok) throw new Error(data.error || "Could not update the desk.");
      if (data.applications) setRows(data.applications);
      if (data.managers) setDesk(data.managers);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the desk.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="manage-desk">
      <nav aria-label="Filter applications" className="wire-filters">
        {(["all", "open", "shortlist", "passed"] as const).map((item) => (
          <HouseChip
            key={item}
            label={item === "all" ? "All" : item === "open" ? "New" : item === "shortlist" ? "Shortlist" : "Passed"}
            on={filter === item}
            onClick={() => setFilter(item)}
          />
        ))}
      </nav>
      {error ? <p className="house-bid-err">{error}</p> : null}
      {shown.length ? (
        <ul className="house-posts">
          {shown.map((row) => (
            <li
              className={`li-card house-post${row.id === focus ? " is-focus" : ""}`}
              id={`app-${row.id}`}
              key={row.id}
            >
              <p className="house-post-meta">
                <span>{row.status === "open" ? "New" : row.status === "shortlist" ? "Shortlist" : "Passed"}</span>
                <span>{ago(row.createdAt)}</span>
              </p>
              <h2>
                <Link href={`/jobs/${row.jobId}`}>{row.title}</Link>
              </h2>
              <p>
                <Link href={`/network/u/${encodeURIComponent(row.username)}`}>@{row.username}</Link>
                {row.seat ? ` · ${row.seat}` : ""}
              </p>
              <p>{row.note}</p>
              {row.href ? (
                <p className="house-app-link">
                  <a href={row.href} rel="noreferrer noopener">
                    Portfolio
                  </a>
                </p>
              ) : null}
              <p className="guide-cta">
                <HouseButton
                  disabled={busy || row.status === "shortlist"}
                  onClick={() => void act({ action: "status", id: row.id, status: "shortlist" })}
                >
                  Shortlist
                </HouseButton>
                <HouseButton
                  disabled={busy || row.status === "passed"}
                  ghost
                  onClick={() => void act({ action: "status", id: row.id, status: "passed" })}
                >
                  Pass
                </HouseButton>
                {row.status !== "open" ? (
                  <HouseButton
                    disabled={busy}
                    ghost
                    onClick={() => void act({ action: "status", id: row.id, status: "open" })}
                  >
                    Open again
                  </HouseButton>
                ) : null}
                <Link className="nav-link" href={`/network/messages?with=${encodeURIComponent(row.username)}`}>
                  Message
                </Link>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="app-lead">
          {rows.length
            ? "Nothing in that filter."
            : "No applications yet. When a signed-in seat applies, this desk is notified."}
        </p>
      )}

      <section className="manage-roster">
        <p className="lobby-label">{PAGE.manage} roster</p>
        <ul className="manage-names">
          {desk.map((name) => (
            <li key={name}>
              <Link href={`/network/u/${encodeURIComponent(name)}`}>@{name}</Link>
              {name.toLowerCase() !== you.toLowerCase() ? (
                <button
                  className="nav-link"
                  disabled={busy}
                  onClick={() => void act({ action: "unroster", username: name })}
                  type="button"
                >
                  Remove
                </button>
              ) : (
                <span>you</span>
              )}
            </li>
          ))}
        </ul>
        <form
          className="manage-add"
          onSubmit={(event) => {
            event.preventDefault();
            void act({ action: "roster", username: name });
          }}
        >
          <HouseField
            label="Add a manager"
            onChange={(event) => setName(event.target.value)}
            placeholder="username"
            value={name}
          />
          <HouseButton disabled={busy || !name.trim()} type="submit">
            Add
          </HouseButton>
        </form>
      </section>
    </div>
  );
}
