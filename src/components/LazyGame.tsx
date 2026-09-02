"use client";

import dynamic from "next/dynamic";

export const LazyGameClient = dynamic(
  () => import("@/components/GameClient").then((mod) => mod.GameClient),
);
