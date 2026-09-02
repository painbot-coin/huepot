"use client";

import dynamic from "next/dynamic";
import { PitLoader } from "@/components/PitLoader";

export const LazyRoomLobby = dynamic(
  () => import("@/components/RoomLobby").then((mod) => mod.RoomLobby),
  { loading: () => <PitLoader label="Opening the rooms…" /> },
);
