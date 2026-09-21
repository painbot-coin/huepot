import type { Metadata } from "next";
import Link from "next/link";
import { AfterTakeDoor } from "@/components/AfterTakeDoor";
import { Avatar } from "@/components/Avatar";
import { TakeHangout } from "@/components/TakeHangout";
import { getHeaderUser } from "@/lib/auth";
import { classicHourAt, classicHourClock } from "@/lib/classic-hour";
import { fogCupAt, fogCupClock } from "@/lib/fog-cup";
import { seatedAt } from "@/lib/friends";
import { sittingNames } from "@/lib/game";
import { formatUsdt } from "@/lib/money";
import { nightHourAt, nightHourClock } from "@/lib/night-hour";
import { withStoreRead } from "@/lib/store";
import { getPublicTake, takeWinners } from "@/lib/takes";

function tonightWhen() {
  const hour = classicHourAt();
  const night = nightHourAt();
  const cup = fogCupAt();
  return `Classic ${classicHourClock(hour.hour)}. Night ${nightHourClock(night.hour)}. Fog cup ${fogCupClock(cup.weekday, cup.hour)}.`;
}

export const runtime = "nodejs";

async function loadTake(id: string) {
  return withStoreRead(async (store) => {
    const take = await getPublicTake(id, store);
    if (!take) return null;
    const winners = await takeWinners(take, store);
    const room = Object.values(store.rooms).find((item) => item.slug === take.slug);
    const sitting = room ? sittingNames(store, room) : [];
    let winnerSit: { username: string; slug: string; name: string } | null = null;
    for (const winner of winners) {
      const player = Object.values(store.users).find(
        (user) => user.username.toLowerCase() === winner.username.toLowerCase(),
      );
      if (!player) continue;
      const seat = seatedAt(store, player.id);
      if (seat) {
        winnerSit = { username: winner.username, slug: seat.slug, name: seat.name };
        break;
      }
    }
    return { take, winners, sitting, winnerSit };
  });
}

/** "bill", "bill and ana", "bill and 3 others". */
function creditLine(winners: { username: string }[]) {
  if (winners.length === 1) return winners[0].username;
  if (winners.length === 2) return `${winners[0].username} and ${winners[1].username}`;
  return `${winners[0].username} and ${winners.length - 1} others`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const found = await loadTake(id);
  if (!found) {
    return {
      title: "Take — Huepot",
      description: "Same-price color buttons. Biggest color splits the rest of the pot.",
    };
  }
  const { take, winners } = found;
  const who = winners.length ? creditLine(winners) : take.names;
  const short = `${who} took ${formatUsdt(take.amount)} USDT · ${take.roomName}`;
  const description = `Same price on every color. Biggest color takes the rest. ${tonightWhen()}`;
  return {
    title: short,
    description,
    openGraph: {
      title: short,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: short,
      description,
    },
  };
}

export default async function TakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [found, user] = await Promise.all([loadTake(id), getHeaderUser()]);
  if (!found) {
    return (
      <main className="prose-page">
        <p className="hall-kicker">The take</p>
        <h1 className="font-display text-4xl text-white">That take is gone</h1>
        <p>Sit a live table and wait for the next one.</p>
        <p>
          <Link className="chip-btn" href="/rooms/classic">
            Sit Classic
          </Link>
        </p>
      </main>
    );
  }

  const { take, winners, sitting, winnerSit } = found;
  const hour = classicHourAt();
  const night = nightHourAt();
  const cup = fogCupAt();

  return (
    <main className="prose-page take-page">
      <p className="hall-kicker">The take</p>
      <p className="lobby-kicker">{take.roomName}</p>
      {winners.length === 1 ? (
        <Avatar avatar={winners[0].avatar} size="lg" username={winners[0].username} />
      ) : null}
      <h1 className="font-display text-4xl text-white">
        {winners.length ? creditLine(winners) : take.names} took the pot
      </h1>
      <p className="take-page-pot">{formatUsdt(take.amount)} USDT</p>
      <p className="take-page-hue">
        on {take.names} · round #{take.number}
      </p>
      {winners.length > 1 ? (
        <ul className="take-page-split">
          {winners.map((winner) => (
            <li key={winner.username}>
              <Link href={`/network/u/${encodeURIComponent(winner.username)}`}>
                {winner.username}
              </Link>
              <span>{formatUsdt(winner.amount)} USDT</span>
            </li>
          ))}
        </ul>
      ) : winners.length === 1 ? (
        <p>
          <Link href={`/network/u/${encodeURIComponent(winners[0].username)}`}>
            See {winners[0].username}’s record
          </Link>
        </p>
      ) : null}
      <p>
        Same price on every color. Biggest color takes the rest. {tonightWhen()}
      </p>
      <TakeHangout
        cup={cup}
        hour={hour.hour}
        inviteCode={user?.inviteCode ?? ""}
        night={night.hour}
        sitting={sitting}
        sitWhen={tonightWhen()}
        take={take}
        winnerSit={winnerSit}
        winners={winners}
      />
      <p>
        <Link href={`/fairness/${take.id}`}>Open the ledger</Link>
      </p>
      <AfterTakeDoor at={take.at} />
    </main>
  );
}
