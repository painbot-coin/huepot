"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HouseButton, HouseChip, HouseField } from "@/components/HouseUi";
import { hideReportLabel, reportWhere, type ReportKind } from "@/lib/report-desk";

export type DeskReport = {
  id: string;
  kind: ReportKind;
  roomSlug: string;
  eventId: string;
  username: string;
  body: string;
  createdAt: number;
  status: "open" | "hidden" | "dismissed";
};

export type DeskReported = {
  username: string;
  open: number;
  total: number;
  hidden: number;
  reporters: number;
  lastAt: number;
};

function ago(at: number) {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function ManageReports({
  reports,
  reported,
  reviewers,
  focus = "",
  you = "",
  canRoster = false,
}: {
  reports: DeskReport[];
  reported: DeskReported[];
  reviewers: string[];
  focus?: string;
  you?: string;
  canRoster?: boolean;
}) {
  const [rows, setRows] = useState(reports);
  const [named, setNamed] = useState(reported);
  const [desk, setDesk] = useState(reviewers);
  const [filter, setFilter] = useState<"all" | "open">("open");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const shown = useMemo(() => {
    const list = filter === "open" ? rows.filter((row) => row.status === "open") : rows;
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
        reports?: DeskReport[];
        reported?: DeskReported[];
        reviewers?: string[];
      };
      if (!res.ok) throw new Error(data.error || "Could not update the report.");
      if (data.reports) setRows(data.reports);
      if (data.reported) setNamed(data.reported);
      if (data.reviewers) setDesk(data.reviewers);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="manage-reports">
      {named.length ? (
        <ul className="manage-named">
          {named.map((row) => (
            <li key={row.username}>
              <Link href={`/network/u/${encodeURIComponent(row.username)}`}>@{row.username}</Link>
              <span>
                {row.reporters} reporter{row.reporters === 1 ? "" : "s"} · {row.open} open ·{" "}
                {row.total} total
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <nav aria-label="Filter reports" className="wire-filters">
        {(["open", "all"] as const).map((item) => (
          <HouseChip
            key={item}
            label={item === "open" ? "Open" : "All"}
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
              id={`report-${row.id}`}
              key={row.id}
            >
              <p className="house-post-meta">
                <span>{reportWhere(row)}</span>
                <span>{row.status}</span>
                <span>{ago(row.createdAt)}</span>
              </p>
              <h2>
                <Link href={`/network/u/${encodeURIComponent(row.username)}`}>@{row.username}</Link>
              </h2>
              <p>{row.body}</p>
              {row.status === "open" ? (
                <p className="guide-cta">
                  <HouseButton disabled={busy} onClick={() => void act({ action: "hide-report", id: row.id })}>
                    {hideReportLabel(row.kind)}
                  </HouseButton>
                  <HouseButton disabled={busy} ghost onClick={() => void act({ action: "dismiss-report", id: row.id })}>
                    Dismiss
                  </HouseButton>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="app-lead">
          {rows.length
            ? "Nothing open. Dismissed and hidden stay under All."
            : "No reports yet. Chat, posts, comments, and messages land here."}
        </p>
      )}
      <section className="manage-roster">
        <p className="lobby-label">Report roster</p>
        {desk.length ? (
          <ul className="manage-names">
            {desk.map((item) => (
              <li key={item}>
                <Link href={`/network/u/${encodeURIComponent(item)}`}>@{item}</Link>
                {canRoster && item.toLowerCase() !== you.toLowerCase() ? (
                  <button
                    className="nav-link"
                    disabled={busy}
                    onClick={() => void act({ action: "unroster-review", username: item })}
                    type="button"
                  >
                    Remove
                  </button>
                ) : item.toLowerCase() === you.toLowerCase() ? (
                  <span>you</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="app-lead">Nobody is rostered. Add a name so a report has a keeper.</p>
        )}
        {canRoster ? (
          <form
            className="manage-add"
            onSubmit={(event) => {
              event.preventDefault();
              void act({ action: "roster-review", username: name });
            }}
          >
            <HouseField
              label="Add a reviewer"
              onChange={(event) => setName(event.target.value)}
              placeholder="username"
              value={name}
            />
            <HouseButton disabled={busy || !name.trim()} type="submit">
              Add
            </HouseButton>
          </form>
        ) : null}
      </section>
    </div>
  );
}
