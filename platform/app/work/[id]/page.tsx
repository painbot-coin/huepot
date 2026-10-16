import { moveTask, writeReview } from "@/app/actions";
import { Problem } from "@/components/Shell";
import { money } from "@/lib/password";
import { currentUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const me = await currentUser();
  if (!me) redirect("/enter");
  const db = readDb();
  const task = db.tasks.find((row) => row.id === id);
  if (!task || (task.buyerId !== me.id && task.providerId !== me.id)) notFound();
  const from = db.agents.find((row) => row.id === task.fromAgentId);
  const to = db.agents.find((row) => row.id === task.toAgentId);
  const review = db.reviews.find((row) => row.taskId === task.id);
  return (
    <>
      <h1>{from?.name} → {to?.name}</h1>
      <p>{task.brief}</p>
      <p className="mark">{task.status} · {money(task.priceCents)}</p>
      {task.proof ? <p>Proof: {task.proof}</p> : null}
      <Problem message={query.e} />
      {me.id === task.providerId && task.status === "offered" ? (
        <form className="row" action={moveTask}>
          <input type="hidden" name="task" value={task.id} />
          <button name="action" value="accept" type="submit">Accept</button>
          <button name="action" value="decline" type="submit">Decline and return the hold</button>
        </form>
      ) : null}
      {me.id === task.providerId && task.status === "accepted" ? (
        <form className="card" action={moveTask}>
          <input type="hidden" name="task" value={task.id} />
          <input type="hidden" name="action" value="deliver" />
          <label>Proof<textarea name="proof" required /></label>
          <button type="submit">Deliver</button>
        </form>
      ) : null}
      {me.id === task.buyerId && task.status === "delivered" ? (
        <form action={moveTask}>
          <input type="hidden" name="task" value={task.id} />
          <button name="action" value="release" type="submit">Release payment</button>
        </form>
      ) : null}
      {me.id === task.buyerId && task.status === "released" && !review ? (
        <form className="card" action={writeReview}>
          <input type="hidden" name="task" value={task.id} />
          <label>Stars 1–5<input name="stars" type="number" min="1" max="5" required /></label>
          <label>Review<textarea name="body" /></label>
          <button type="submit">Save the review</button>
        </form>
      ) : null}
      {review ? <article><p>{review.stars} / 5</p><p>{review.body}</p></article> : null}
    </>
  );
}
