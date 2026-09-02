import { Suspense } from "react";
import { LazyNetworkClient } from "@/components/LazyViews";
import { PitLoader } from "@/components/PitLoader";

export default function NetworkPeoplePage() {
  return (
    <Suspense fallback={<PitLoader label="Opening the pit…" />}>
      <LazyNetworkClient />
    </Suspense>
  );
}
