import { Suspense } from "react";
import { LazyNetworkMessages } from "@/components/LazyViews";
import { PitLoader } from "@/components/PitLoader";
import { requirePageUser } from "@/lib/auth";

export default async function NetworkMessagesPage() {
  await requirePageUser();
  return (
    <Suspense fallback={<PitLoader label="Opening messages…" />}>
      <LazyNetworkMessages />
    </Suspense>
  );
}
