import type { Metadata } from "next";
import Link from "next/link";
import { fogCupAt, fogCupClock } from "@/lib/fog-cup";
import { formatUsdt } from "@/lib/money";
import { withStoreRead } from "@/lib/store";
import { getPublicTake } from "@/lib/takes";

function cupWhen() {
  const cup = fogCupAt();
  return `Fog cup ${fogCupClock(cup.weekday, cup.hour)}`;
}

export const runtime = "nodejs";

async function loadTake(id: string) {
  return withStoreRead((store) => getPublicTake(id, store));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const take = await loadTake(id);
  if (!take) {
    return {
      title: "Take — Huepot",
      description: "Same-price color buttons. Biggest color splits the rest of the pot.",
    };
  }
  // Short enough to survive a browser tab and a social card headline.
  const short = `${take.names} took ${formatUsdt(take.amount)} USDT · ${take.roomName}`;
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
  const take = await loadTake(id);
  if (!take) {
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

  return (
    <main className="prose-page take-page">
      <p className="hall-kicker">The take</p>
      <p className="lobby-kicker">{take.roomName}</p>
      <h1 className="font-display text-4xl text-white">{take.names} took the pot</h1>
      <p className="take-page-pot">{formatUsdt(take.amount)} USDT</p>
      <p>
        Same price on every color. Biggest color takes the rest. {cupWhen()}.
      </p>
      <p>
        <Link className="chip-btn" href={`/rooms/${take.slug}`}>
          Sit the next round
        </Link>
        {" · "}
        <Link href={`/fairness/${take.id}`}>Open the ledger</Link>
      </p>
    </main>
  );
}
