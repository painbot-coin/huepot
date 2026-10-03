import { Suspense } from "react";
import { LazyNetworkMessages } from "@/components/LazyViews";
import { PitLoader } from "@/components/PitLoader";
import { requirePageUser } from "@/lib/auth";
import { sendToSeatIfNeeded } from "@/lib/send-to-seat";

export default async function NetworkMessagesPage() {
  await requirePageUser("/network/messages");
  await sendToSeatIfNeeded("/network/messages");
  return (
    <Suspense fallback={<PitLoader label="Opening letters…" />}>
      <LazyNetworkMessages />
    </Suspense>
  );
}
