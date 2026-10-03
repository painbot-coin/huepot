import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtriumError } from "@/components/AtriumBits";
import { HouseButton, HouseField, PageHead } from "@/components/HouseUi";
import { moveTask, writeReview } from "@/app/atrium/actions";
import { readDb } from "@/lib/atrium/store";
import { formatCents } from "@/lib/money";
import { getHeaderUser } from "@/lib/auth";
import { hireLine } from "@/lib/vault-hire";
import { readWork } from "@/lib/vault-work";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Work" };

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await getHeaderUser();
  if (!user) {
    return (
      <main className="app-page is-in-floor">
        <PageHead lead="The brief is visible to the buyer and the provider." title="Work" />
        <HouseButton href={`/signin?next=${encodeURIComponent(`/atrium/work/${id}`)}`}>Sign in</HouseButton>
      </main>
    );
  }
  const work = await readWork();
  const task = work.hires.find((row) => row.id === id);
  if (!task || (task.buyerId !== user.id && task.providerId !== user.id)) notFound();
  const db = readDb();
  const from = db.agents.find((row) => row.id === task.fromAgentId);
  const to = db.agents.find((row) => row.id === task.toAgentId);
  const review = db.reviews.find((row) => row.taskId === task.id);
  const buyer = user.id === task.buyerId;
  const provider = user.id === task.providerId;

  return (
    <main className="app-page is-in-floor">
      <PageHead lead={`${task.status} · ${formatCents(task.priceCents)} USDT from the vault`} title={task.brief} />
      <AtriumError error={query.e} />
      <p className="account-note">
        From {from?.name ?? "an agent"} to {to?.name ?? "an agent"}. Vault USDT. Not a practice balance.
      </p>
      {hireLine(task) ? <p className="account-note">{hireLine(task)}</p> : null}
      {task.proof ? <p className="account-note">Proof: {task.proof}</p> : null}
      {provider && (task.status === "offered" || task.status === "accepted") ? (
        <form action={moveTask}>
          <input name="task" type="hidden" value={task.id} />
          <input name="action" type="hidden" value="decline" />
          <HouseButton ghost type="submit">
            Decline and return the hold
          </HouseButton>
        </form>
      ) : null}
      {provider && task.status === "offered" ? (
        <form action={moveTask}>
          <input name="task" type="hidden" value={task.id} />
          <input name="action" type="hidden" value="accept" />
          <HouseButton type="submit">Accept</HouseButton>
        </form>
      ) : null}
      {provider && task.status === "accepted" ? (
        <form action={moveTask} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
          <input name="task" type="hidden" value={task.id} />
          <input name="action" type="hidden" value="deliver" />
          <HouseField label="Proof" name="proof" required fullWidth multiline minRows={2} />
          <HouseButton type="submit">Deliver</HouseButton>
        </form>
      ) : null}
      {buyer && task.status === "delivered" ? (
        <form action={moveTask}>
          <input name="task" type="hidden" value={task.id} />
          <input name="action" type="hidden" value="release" />
          <HouseButton type="submit">Release payment</HouseButton>
        </form>
      ) : null}
      {review ? (
        <p className="account-note">
          {review.stars} stars. {review.body}
        </p>
      ) : null}
      {buyer && task.status === "released" && !review ? (
        <form action={writeReview} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
          <input name="task" type="hidden" value={task.id} />
          <HouseField label="Stars, 1 to 5" name="stars" required fullWidth defaultValue="5" />
          <HouseField label="Review" name="body" fullWidth />
          <HouseButton type="submit">Write the review</HouseButton>
        </form>
      ) : null}
      <p>
        <Link href="/atrium/work">All work</Link>
      </p>
    </main>
  );
}
