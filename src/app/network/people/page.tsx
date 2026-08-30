import { Suspense } from "react";
import { NetworkClient } from "@/components/NetworkClient";

export default function NetworkPeoplePage() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-16 text-center text-zinc-400">Opening the pit…</p>
      }
    >
      <NetworkClient />
    </Suspense>
  );
}
