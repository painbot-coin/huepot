import type { Metadata } from "next";
import Link from "next/link";
import { fogCupAt, fogCupClock } from "@/lib/fog-cup";
import { formatUsdt } from "@/lib/money";
import { withStoreRead } from "@/lib/store";
import { takeLine, withSitWhen } from "@/lib/take-copy";
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
  const line = withSitWhen(takeLine(take), cupWhen());
  return {
    title: line,
    description: `Same price every coin. Biggest color takes the rest. ${cupWhen()}.`,
    openGraph: {
      title: line,
      description: `Same price every coin. Biggest color takes the rest. ${cupWhen()}.`,
    },
    twitter: {
      card: "summary_large_image",
      title: line,
      description: `Same price every coin. Biggest color takes the rest. ${cupWhen()}.`,
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
      <p className="lobby-kicker">{take.roomName}</p>
      <h1 className="font-display text-4xl text-white">{take.names} took the pot</h1>
      <p className="take-page-pot">{formatUsdt(take.amount)} USDT</p>
      <p>{withSitWhen(takeLine(take), cupWhen())}.</p>
      <p>
        <Link className="chip-btn" href={`/rooms/${take.slug}`}>
          Sit the next round
        </Link>
        {" · "}
        <Link href={`/fairness/${take.id}`}>Check this round</Link>
      </p>
    </main>
  );
}
