"use client";

import dynamic from "next/dynamic";

export const LazyRoomLobby = dynamic(
  () => import("@/components/RoomLobby").then((mod) => mod.RoomLobby),
);
