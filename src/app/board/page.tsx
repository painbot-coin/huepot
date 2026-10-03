import { HouseButton } from "@/components/HouseUi";
import type { Metadata } from "next";
import Link from "next/link";
import { HouseBoard } from "@/components/HouseBoard";
import { HouseFloor } from "@/components/HouseFloor";
import { getHeaderUser } from "@/lib/auth";
import { floorYou } from "@/lib/house-you";
import { boardSitDoor, type BoardSitDoor } from "@/lib/board-sit";
import { classicHourAt } from "@/lib/classic-hour";
import { fogCupAt } from "@/lib/fog-cup";
import { boardDoorOf, readyFriends } from "@/lib/friends";
import { nightHourAt } from "@/lib/night-hour";
import { listHouseBoard, listHouseBoardWeek } from "@/lib/record";
import { withStoreRead } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Who played and who won. HUE standing from real play. Wins and activity only. Play from a row.",
};

export default async function BoardPage() {
  const [seats, week, user] = await Promise.all([
    listHouseBoard(),
    listHouseBoardWeek(),
    getHeaderUser(),
  ]);
  await readyFriends();
  const doors = await withStoreRead((store) => {
    const map: Record<string, BoardSitDoor> = {};
    const names = new Set([...seats, ...week].map((seat) => seat.username));
    for (const username of names) {
      map[username] = user
        ? boardDoorOf(store, user.id, username)
        : boardSitDoor({
            self: false,
            signedIn: false,
            relation: "none",
            sittingSlug: "",
          });
    }
    return map;
  });
  const hour = classicHourAt();
  const night = nightHourAt();
  const cup = fogCupAt();
  return (
    <HouseFloor
      kicker="Leaderboard"
      side={
        <div>
          <p className="lobby-label">Standing</p>
          <p className="account-note">
            HUE is standing from real play, not money. Wins and activity only.
          </p>
          <div className="li-profile-act">
            <HouseButton href="/rooms/classic">
              Play Classic
            </HouseButton>
            <HouseButton ghost href="/jobs">
              Jobs
            </HouseButton>
          </div>
        </div>
      }
      you={floorYou(user)}
    >
      <HouseBoard
        cup={cup}
        doors={doors}
        hour={hour.hour}
        inviteCode={user?.inviteCode ?? ""}
        night={night.hour}
        seats={seats}
        week={week}
        you={user?.username ?? ""}
      />
    </HouseFloor>
  );
}
