"use client";

import dynamic from "next/dynamic";

const SoundBus = dynamic(
  () => import("@/components/SoundBus").then((mod) => mod.SoundBus),
  { ssr: false },
);

export const LazyMessageDock = dynamic(
  () => import("@/components/MessageDock").then((mod) => mod.MessageDock),
  { ssr: false },
);

export function LazyFx() {
  return <SoundBus />;
}
