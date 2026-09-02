"use client";

import dynamic from "next/dynamic";

const Atmosphere = dynamic(
  () => import("@/components/Atmosphere").then((mod) => mod.Atmosphere),
);

const SoundBus = dynamic(
  () => import("@/components/SoundBus").then((mod) => mod.SoundBus),
  { ssr: false },
);

export const LazyMessageDock = dynamic(
  () => import("@/components/MessageDock").then((mod) => mod.MessageDock),
  { ssr: false },
);

export function LazyFx() {
  return (
    <>
      <Atmosphere />
      <SoundBus />
    </>
  );
}
