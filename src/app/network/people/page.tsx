import { Suspense } from "react";
import { LazyNetworkClient } from "@/components/LazyViews";
import { PitLoader } from "@/components/PitLoader";
import { requirePageUser } from "@/lib/auth";
import { sendToSeatIfNeeded } from "@/lib/send-to-seat";

export default async function NetworkPeoplePage() {
  await requirePageUser("/network/people");
  await sendToSeatIfNeeded("/network/people");
  return (
    <Suspense fallback={<PitLoader label="Opening people…" />}>
      <LazyNetworkClient />
    </Suspense>
  );
}
