"use client";

import Link from "next/link";
import { useState } from "react";
import { HouseButton } from "@/components/HouseUi";
import { HOUSE_SEATS } from "@/lib/house-seats";
import type { DeskPerson } from "@/lib/house-people";

function joined(at: number) {
  if (!at) return "";
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Chip({ children }: { children: string }) {
  return <span className="manage-chip">{children}</span>;
}

export function ManagePeople({
  people,
  you,
  seen,
  onPeople,
}: {
  people: DeskPerson[];
  you: string;
  seen?: Record<string, string>;
  onPeople?: (people: DeskPerson[]) => void;
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<Record<string, string>>({});

  async function act(id: string, body: Record<string, string>) {
    setBusy(id);
    setError("");
    try {
      const res = await fetch("/api/manage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; people?: DeskPerson[] };
      if (!res.ok) throw new Error(data.error || "Could not update that seat.");
      if (data.people) onPeople?.(data.people);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that seat.");
    } finally {
      setBusy("");
    }
  }

  if (!people.length) {
    return <p className="account-note">No named seat in this count.</p>;
  }

  return (
    <div className="manage-people">
      {error ? <p className="account-note">{error}</p> : null}
      <ul className="manage-people-list">
        {people.map((row) => {
          const self = row.username.toLowerCase() === you.toLowerCase();
          const typed = (confirm[row.id] ?? "").trim().toLowerCase() === row.username.toLowerCase();
          const locked = busy === row.id;
          return (
            <li className="li-card manage-seat" key={row.id}>
              <div className="manage-seat-head">
                <Link href={`/network/u/${encodeURIComponent(row.username)}`}>@{row.username}</Link>
                {self ? <Chip>You</Chip> : null}
                {row.closed ? <Chip>Closed</Chip> : null}
                {row.manager ? <Chip>Manager</Chip> : null}
                {row.reviewer ? <Chip>Reviewer</Chip> : null}
                {row.frozen ? <Chip>Frozen</Chip> : null}
              </div>
              <p className="account-note">
                {row.craft}
                {row.createdAt ? ` · joined ${joined(row.createdAt)}` : ""}
                {row.invite ? ` · invite ${row.invite}` : " · no invite yet"}
                {` · ${seen?.[row.id] ?? "No named visit this week."}`}
              </p>
              <div className="manage-seat-tools">
                <label>
                  Craft
                  <select
                    aria-label={`Craft for ${row.username}`}
                    defaultValue={row.seat}
                    disabled={locked || row.closed}
                    key={`${row.id}-${row.seat}`}
                    onChange={(event) => void act(row.id, { action: "craft", username: row.username, seat: event.target.value })}
                  >
                    <option value="">No craft</option>
                    {HOUSE_SEATS.map((seat) => (
                      <option key={seat.id} value={seat.id}>
                        {seat.label}
                      </option>
                    ))}
                  </select>
                </label>
                {row.invite || row.closed ? null : (
                  <HouseButton disabled={locked} ghost onClick={() => void act(row.id, { action: "invite", username: row.username })} type="button">
                    Invite
                  </HouseButton>
                )}
                {self || row.closed ? null : row.frozen ? (
                  <HouseButton disabled={locked} ghost onClick={() => void act(row.id, { action: "unfreeze", username: row.username })} type="button">
                    Unfreeze
                  </HouseButton>
                ) : (
                  <HouseButton disabled={locked} ghost onClick={() => void act(row.id, { action: "freeze", username: row.username })} type="button">
                    Freeze
                  </HouseButton>
                )}
                {self || row.closed ? null : row.manager ? (
                  <HouseButton disabled={locked} ghost onClick={() => void act(row.id, { action: "unroster", username: row.username })} type="button">
                    Remove manager
                  </HouseButton>
                ) : (
                  <HouseButton disabled={locked} ghost onClick={() => void act(row.id, { action: "roster", username: row.username })} type="button">
                    Make manager
                  </HouseButton>
                )}
                {self || row.closed ? null : row.reviewer ? (
                  <HouseButton disabled={locked} ghost onClick={() => void act(row.id, { action: "unroster-review", username: row.username })} type="button">
                    Remove reviewer
                  </HouseButton>
                ) : (
                  <HouseButton disabled={locked} ghost onClick={() => void act(row.id, { action: "roster-review", username: row.username })} type="button">
                    Make reviewer
                  </HouseButton>
                )}
                {self ? null : row.closed ? (
                  <HouseButton disabled={locked} ghost onClick={() => void act(row.id, { action: "reopen", username: row.username })} type="button">
                    Open again
                  </HouseButton>
                ) : (
                  <span className="manage-close">
                    <input
                      aria-label={`Type ${row.username} to close`}
                      onChange={(event) => setConfirm((prev) => ({ ...prev, [row.id]: event.target.value }))}
                      placeholder={`Type ${row.username}`}
                      value={confirm[row.id] ?? ""}
                    />
                    <HouseButton
                      disabled={locked || !typed}
                      onClick={() => void act(row.id, { action: "close", username: row.username })}
                      type="button"
                    >
                      Close
                    </HouseButton>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
