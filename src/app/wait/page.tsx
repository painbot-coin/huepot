import { HouseButton, PageHead } from "@/components/HouseUi";
import type { Metadata } from "next";
import Link from "next/link";
import { EveningWalk } from "@/components/EveningWalk";
import { HouseFloor } from "@/components/HouseFloor";
import { WaitDesk } from "@/components/WaitDesk";
import { getHeaderUser } from "@/lib/auth";
import { deskHref, sitParam } from "@/lib/house-mark-list";
import { floorYou } from "@/lib/house-you";
import { sendToSeatIfNeeded } from "@/lib/send-to-seat";

export const metadata: Metadata = {
  title: "Games",
  description:
    "Play game RL while Classic is quiet. Game, AI, play, and betting meet on the floor. House vs house first. Buy a file or a project from the store.",
};

export default async function WaitPage({
  searchParams,
}: {
  searchParams: Promise<{ sit?: string; pair?: string }>;
}) {
  const params = await searchParams;
  const sit = sitParam(params.sit);
  const pair = sitParam(params.pair);
  await sendToSeatIfNeeded(pair ? `/wait?pair=${pair}` : sit ? deskHref(sit) : "/wait");
  const user = await getHeaderUser();
  return (
    <HouseFloor kicker="Games" you={floorYou(user)}>
    <main className="app-page is-in-floor">
      <EveningWalk sit={sit} />
      <PageHead
        lead="Six games, and each one sits differently. Down keeps the stack low. Burst holds a column and takes a four. Catch covers both sides. Snake stays on the loop, and a watch counts the food. Aim closes the flick. Lane waits for the ripe mark. Break clears a wall, then the pad is already under the next ball. Sit a book here, then take the file from the store. A watch on a priced book stays on that vault sit until gold is enough. Gold is only for a priced sit. The pot stays on Classic."
        title="Sit a book"
      />
      <WaitDesk pair={pair} sit={pair || sit} />
      <p className="guide-cta">
        <HouseButton href="/wait/store">
          Store
        </HouseButton>
        <Link className="nav-link" href="/rooms/classic">
          Play Classic
        </Link>
        <Link className="nav-link" href="/">
          Home
        </Link>
      </p>
    </main>
    </HouseFloor>
  );
}
