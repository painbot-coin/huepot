"use client";

import Link from "next/link";
import { HouseButton } from "@/components/HouseUi";
import { formatCents } from "@/lib/money";
import { canPlayMark, filterMarks, groupMarks, type MarkFilter, type PublicMark } from "@/lib/house-mark-list";

const FILTERS: { id: MarkFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "free", label: "Free" },
  { id: "vault", label: "Paid" },
  { id: "coming", label: "Coming" },
];

export function WaitMarks({
  marks,
  filter,
  selected,
  signedIn,
  balanceCents,
  busy,
  error,
  onFilter,
  onPick,
  onDownload,
}: {
  marks: PublicMark[];
  filter: MarkFilter;
  selected: string;
  signedIn: boolean;
  balanceCents: number;
  busy?: boolean;
  error?: string;
  onFilter: (filter: MarkFilter) => void;
  onPick: (id: string) => void;
  onDownload: (id: string) => void;
}) {
  const groups = groupMarks(filterMarks(marks, filter));
  return (
    <section className="wait-models" aria-label="House models">
      <p className="wait-shelf-kicker">House models</p>
      <p className="wait-shelf-lead">
        Game RL books only — not the color pot. Stack, Catch, Snake, Aim, Lane,
        and Break sit. Take the trained weights as a small text file of numbers.
        Anyone can sit. Gold is only to take a priced file home.
      </p>
      <div className="wait-tag-list" role="tablist" aria-label="Model tags">
        {FILTERS.map((row) => (
          <button
            key={row.id}
            className={`wait-tag ${filter === row.id ? "is-on" : ""}`}
            type="button"
            aria-pressed={filter === row.id}
            onClick={() => onFilter(row.id)}
          >
            {row.label}
          </button>
        ))}
      </div>
      {signedIn ? (
        <p className="wait-shelf-bank">Wallet {formatCents(balanceCents)} USDT</p>
      ) : (
        <p className="wait-shelf-bank">Anyone can watch. A priced model needs an account.</p>
      )}
      {groups.map((game) => (
        <div key={game.id} className="wait-game">
          <p className="wait-game-title">{game.title}</p>
          <p className="wait-game-how">{game.how}</p>
          <ul className="wait-mark-list">
            {game.rows.map((mark) => {
              const playable = canPlayMark(mark);
              return (
                <li key={mark.id} className={`wait-mark ${selected === mark.id ? "is-on" : ""} ${mark.status}`}>
                  <div className="wait-mark-top">
                    <p className="wait-mark-name">
                      {mark.name}
                      <span>{mark.playerType || `v ${mark.version}`}</span>
                    </p>
                    <p className="wait-mark-price">{mark.priceLabel}</p>
                  </div>
                  <p className="wait-mark-how">{mark.how}</p>
                  <p className="wait-mark-tags">
                    {mark.tags.map((tag) => (
                      <em key={tag}>{tag}</em>
                    ))}
                    {mark.bestLines ? <em>best {mark.bestLines}</em> : null}
                    {mark.games && !mark.bestLines ? <em>{mark.games} trains</em> : null}
                  </p>
                  <div className="wait-mark-actions">
                    {playable ? (
                      <HouseButton
                        disabled={busy || selected === mark.id}
                        onClick={() => onPick(mark.id)}
                      >
                        {selected === mark.id ? "On the table" : "See it sit"}
                      </HouseButton>
                    ) : (
                      <HouseButton
                        disabled={selected === mark.id}
                        onClick={() => onPick(mark.id)}
                      >
                        {selected === mark.id ? "This door" : "See the door"}
                      </HouseButton>
                    )}
                    {mark.status === "live" ? (
                      mark.owned || mark.priceCents <= 0 ? (
                        <button className="wait-pad" type="button" disabled={busy} onClick={() => onDownload(mark.id)}>
                          Take the trained weights
                        </button>
                      ) : signedIn ? (
                        <button className="wait-pad" type="button" disabled={busy} onClick={() => onDownload(mark.id)}>
                          Take the trained weights · {mark.priceLabel}
                        </button>
                      ) : (
                        <Link className="wait-pad" href="/signin?next=%2Fwait">
                          Sign in to take
                        </Link>
                      )
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {error ? <p className="wait-mark-error">{error}</p> : null}
    </section>
  );
}
