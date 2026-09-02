import { Suspense } from "react";
import { LazyNetworkClient } from "@/components/LazyViews";
import { PitLoader } from "@/components/PitLoader";
import { requirePageUser } from "@/lib/auth";

export default async function NetworkPeoplePage() {
  await requirePageUser();
  return (
    <Suspense fallback={<PitLoader label="Opening the pit…" />}>
      <LazyNetworkClient />
    </Suspense>
  );
}
