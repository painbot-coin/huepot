import { Suspense } from "react";
import { NetworkMessages } from "@/components/NetworkMessages";

export default function NetworkMessagesPage() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-16 text-center text-zinc-400">Opening messages…</p>
      }
    >
      <NetworkMessages />
    </Suspense>
  );
}
