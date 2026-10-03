import { LazyRoomLobby } from "@/components/LazyLobby";
import { sendToSeatIfNeeded } from "@/lib/send-to-seat";

export default async function Home() {
  await sendToSeatIfNeeded("/");
  return <LazyRoomLobby />;
}
