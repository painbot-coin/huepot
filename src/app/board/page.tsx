import type { Metadata } from "next";
import { HouseBoard } from "@/components/HouseBoard";
import { getHeaderUser } from "@/lib/auth";
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
  title: "The board",
  description:
    "The house book of who sat and who took. HUE standing from real play. Wins and activity only. Sit from a row.",
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
  );
}
