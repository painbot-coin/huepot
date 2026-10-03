"use client";

import { DeskTake } from "@/components/DeskTake";
import type { PublicMark } from "@/lib/house-mark-list";

export function WaitPick({
  label,
  marks,
  value,
  onChange,
  busy,
}: {
  label: string;
  marks: PublicMark[];
  value: string;
  onChange: (id: string) => void;
  busy?: boolean;
}) {
  const picked = marks.find((row) => row.id === value);
  return (
    <div className="wait-pick">
      <label>
        <span>{label}</span>
        <select
          value={value}
          disabled={busy || !marks.length}
          onChange={(event) => onChange(event.target.value)}
        >
          {marks.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
              {row.playerType ? ` · ${row.playerType}` : ""}
            </option>
          ))}
        </select>
      </label>
      {picked?.how ? <em>{picked.how}</em> : null}
      {picked ? <DeskTake key={picked.id} mark={picked} /> : null}
    </div>
  );
}
