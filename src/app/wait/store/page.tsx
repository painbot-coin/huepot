import { HouseButton, PageHead } from "@/components/HouseUi";
import type { Metadata } from "next";
import Link from "next/link";
import { EveningWalk } from "@/components/EveningWalk";
import { HouseFloor } from "@/components/HouseFloor";
import { WaitStore } from "@/components/WaitStore";
import { getHeaderUser } from "@/lib/auth";
import { floorYou } from "@/lib/house-you";
import { potLine, storeSentence } from "@/lib/house-tongue";
import { readRequestLocale } from "@/lib/request-locale";
import { sendToSeatIfNeeded } from "@/lib/send-to-seat";

export const metadata: Metadata = {
  title: "Store",
  description:
    "House games, public models, and member projects. A free file downloads. A priced file needs gold.",
};

export default async function WaitStorePage() {
  await sendToSeatIfNeeded("/wait/store");
  const user = await getHeaderUser();
  const locale = await readRequestLocale();
  return (
    <HouseFloor kicker="Store" you={floorYou(user)}>
    <main className="app-page is-in-floor">
      <EveningWalk />
      <PageHead
        lead={`Watch a sit, open that book on the games desk, and take the file from either door. A watch on a priced book stays on that vault sit until gold is enough. ${storeSentence(locale)} ${potLine(locale)}`}
        title="Games, models, and projects"
      />
      <WaitStore />
      <p className="guide-cta">
        <HouseButton href="/wait">
          Play a game
        </HouseButton>
        <Link className="nav-link" href="/">
          Home
        </Link>
      </p>
    </main>
    </HouseFloor>
  );
}
