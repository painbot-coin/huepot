"use client";

import Link from "next/link";
import { WaitGameArt } from "@/components/WaitGameArt";
import { MARK_GAMES, type MarkKind } from "@/lib/house-mark-list";

export function WaitGames({
  selected,
  onPick,
}: {
  selected: MarkKind;
  onPick: (id: MarkKind) => void;
}) {
  return (
    <section className="wait-models" aria-label="House games">
      <p className="wait-shelf-kicker">House games</p>
      <p className="wait-shelf-lead">
        Six games. The card says what that sit does. The wells start house vs
        house. House sits, world books, and seat projects live in the store.
      </p>
      <ul className="wait-game-grid">
        {MARK_GAMES.map((game) => (
          <li key={game.id}>
            <button
              className={`wait-game-card ${selected === game.id ? "is-on" : ""} ${game.status}`}
              type="button"
              onClick={() => onPick(game.id)}
            >
              <WaitGameArt kind={game.id} />
              <span className="wait-game-title">{game.title}</span>
              <em className="wait-game-how">{game.how}</em>
              <b>{game.status === "live" ? "Live" : "Coming"}</b>
            </button>
          </li>
        ))}
      </ul>
      <p className="wait-shelf-bank">
        <Link className="nav-link" href="/wait/store">
          Model store
        </Link>
        — buy a trained file to run on your own device.
      </p>
    </section>
  );
}
