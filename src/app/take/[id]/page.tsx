import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { fogCupAt, fogCupClock } from "@/lib/fog-cup";
import { formatUsdt } from "@/lib/money";
import { withStoreRead } from "@/lib/store";
import { getPublicTake, takeWinners } from "@/lib/takes";

function cupWhen() {
  const cup = fogCupAt();
  return `Fog cup ${fogCupClock(cup.weekday, cup.hour)}`;
}

export const runtime = "nodejs";

async function loadTake(id: string) {
  return withStoreRead(async (store) => {
    const take = await getPublicTake(id, store);
    if (!take) return null;
    return { take, winners: await takeWinners(take, store) };
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
      title: "Take â€” Huepot",
      description: "Same-price color buttons. Biggest color splits the rest of the pot.",
    };
  }
  const { take, winners } = found;
  // Short enough to survive a browser tab and a social card headline. A name
  // reads better than a colour, so it leads when the payout rows still name one.
  const who = winners.length ? creditLine(winners) : take.names;
  const short = `${who} took ${formatUsdt(take.amount)} USDT Â· ${take.roomName}`;
  const description = `Same price on every color. Biggest color takes the rest. ${cupWhen()}.`;
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
  const found = await loadTake(id);
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

  const { take, winners } = found;

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
        on {take.names} Â· round #{take.number}
      </p>
      {winners.length > 1 ? (
        <ul className="take-page-split">
          {winners.map((winner) => (
            <li key={winner.username}>
              <Link href={`/network?u=${encodeURIComponent(winner.username)}`}>
                {winner.username}
              </Link>
              <span>{formatUsdt(winner.amount)} USDT</span>
            </li>
          ))}
        </ul>
      ) : winners.length === 1 ? (
        <p>
          <Link href={`/network?u=${encodeURIComponent(winners[0].username)}`}>
            See {winners[0].username}â€™s record
          </Link>
        </p>
      ) : null}
      <p>
        Same price on every color. Biggest color takes the rest. {cupWhen()}.
      </p>
      <p>
        <Link className="chip-btn" href={`/rooms/${take.slug}`}>
          Sit the next round
        </Link>
        {" Â· "}
        <Link href={`/fairness/${take.id}`}>Open the ledger</Link>
      </p>
    </main>
  );
}
