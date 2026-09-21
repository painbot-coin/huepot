"use client";

import Link from "next/link";
import { ShareTake } from "@/components/ShareTake";
import { sitWithThemLabel } from "@/lib/company-door";
import { formatTakeLine, withSitWhen } from "@/lib/take-copy";
import type { FogCup, PublicTake, TakeWinner } from "@/lib/types";

export function TakeHangout({
  take,
  winners,
  sitting,
  winnerSit,
  inviteCode,
  hour,
  night,
  cup,
  sitWhen,
}: {
  take: PublicTake;
  winners: TakeWinner[];
  sitting: string[];
  winnerSit: { username: string; slug: string; name: string } | null;
  inviteCode: string;
  hour?: number | null;
  night?: number | null;
  cup?: FogCup | null;
  sitWhen: string;
}) {
  const path = inviteCode ? `/take/${take.id}?ref=${inviteCode}` : `/take/${take.id}`;
  const names = winners.length
    ? winners.map((winner) => winner.username).join(" & ")
    : take.names;

  return (
    <div className="take-hangout">
      <ShareTake
        buttonCount={4}
        canOpenFog={Boolean(inviteCode)}
        clickPrice={1}
        cup={cup}
        fogName={`${(names.split(" & ")[0] || take.roomName).slice(0, 20)} Fog`.slice(0, 28)}
        hour={hour}
        inviteCode={inviteCode}
        line={withSitWhen(formatTakeLine(take.names, take.amount, take.roomName), sitWhen)}
        night={night}
        path={path}
        roundSeconds={60}
        slug={take.slug}
      />
      {sitting.length ? (
        <p className="take-sitting">
          On the table now · {sitting.map((name) => `@${name}`).join(" · ")}
        </p>
      ) : null}
      <p className="take-hangout-doors">
        <Link className="chip-btn" href={`/rooms/${take.slug}`}>
          Sit the next round
        </Link>
        {winnerSit ? (
          <Link className="chip-btn chip-btn-ghost" href={`/rooms/${winnerSit.slug}`}>
            {sitWithThemLabel()}
          </Link>
        ) : null}
      </p>
    </div>
  );
}
