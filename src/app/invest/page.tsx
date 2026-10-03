import { LazyInvestClient } from "@/components/LazyViews";
import { requirePageUser } from "@/lib/auth";
import { deskHref, deskWalletNext, sitFromNext, sitParam } from "@/lib/house-mark-list";

export default async function InvestPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sit?: string }>;
}) {
  const q = await searchParams;
  const sit = sitParam(q.sit) || sitFromNext(q.next ?? "");
  const back = sit ? deskHref(sit) : q.next ? deskWalletNext(q.next) : "";
  const here = sit ? `/invest?sit=${sit}` : back ? `/invest?next=${encodeURIComponent(back)}` : "/invest";
  await requirePageUser(here);
  return <LazyInvestClient back={back} sit={sit} />;
}
