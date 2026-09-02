"use client";

import dynamic from "next/dynamic";
import { PitLoader } from "@/components/PitLoader";

export const LazyGameClient = dynamic(
  () => import("@/components/GameClient").then((mod) => mod.GameClient),
  { loading: () => <PitLoader label="Opening the table…" /> },
);
