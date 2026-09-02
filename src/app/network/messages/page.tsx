import { Suspense } from "react";
import { LazyNetworkMessages } from "@/components/LazyViews";
import { PitLoader } from "@/components/PitLoader";

export default function NetworkMessagesPage() {
  return (
    <Suspense fallback={<PitLoader label="Opening messages…" />}>
      <LazyNetworkMessages />
    </Suspense>
  );
}
