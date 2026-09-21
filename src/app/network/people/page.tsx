import { Suspense } from "react";
import { LazyNetworkClient } from "@/components/LazyViews";
import { PitLoader } from "@/components/PitLoader";
import { requirePageUser } from "@/lib/auth";

export default async function NetworkPeoplePage() {
  await requirePageUser("/network/people");
  return (
    <Suspense fallback={<PitLoader label="Opening the wing…" />}>
      <LazyNetworkClient />
    </Suspense>
  );
}
