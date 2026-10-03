import { HouseButton } from "@/components/HouseUi";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HouseFloor } from "@/components/HouseFloor";
import { HouseJobBid } from "@/components/HouseJobBid";
import { getHeaderUser } from "@/lib/auth";
import { floorYou } from "@/lib/house-you";
import { bidCount, bidForUserJob } from "@/lib/house-job-bids";
import { jobById, jobSeatLabel } from "@/lib/house-jobs";
import { PAGE } from "@/lib/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = jobById(id);
  if (!job) return { title: "Job" };
  return {
    title: job.title,
    description: job.need,
  };
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = jobById(id);
  if (!job) notFound();
  const user = await getHeaderUser();
  const [n, yours] = await Promise.all([
    bidCount(job.id),
    user ? bidForUserJob(user.id, job.id) : Promise.resolve(null),
  ]);

  return (
    <HouseFloor
      extra={
        user ? [{ href: "/jobs/you", label: PAGE.applications }] : undefined
      }
      kicker="Jobs"
      side={
        <div>
          <p className="lobby-label">How applying works</p>
          <p className="account-note">
            Read free. Apply from an account. USDT is not a wage. Gold is not
            a milestone.
          </p>
          <div className="li-profile-act">
            {user ? (
              <HouseButton ghost href="/jobs/you">
                {PAGE.applications}
              </HouseButton>
            ) : null}
            <HouseButton ghost href="/jobs">
              All jobs
            </HouseButton>
            <HouseButton ghost href="/rooms/classic">
              Play Classic
            </HouseButton>
          </div>
        </div>
      }
      you={floorYou(user)}
    >
    <main className="app-page is-in-floor">
      <p className="hall-kicker">Jobs</p>
      <p className="house-post-meta">
        <span>{jobSeatLabel(job.seat)}</span>
        <span>
          {n} application{n === 1 ? "" : "s"}
        </span>
      </p>
      <h1 className="page-title">{job.title}</h1>
      <p className="app-lead">{job.need}</p>
      <ol className="app-steps">
        {job.how.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
      <p className="app-lead">Stay off: {job.stayOff.join(" ")}</p>
      <HouseJobBid
        jobId={job.id}
        next={`/jobs/${job.id}`}
        signedIn={Boolean(user)}
        yours={
          yours
            ? { note: yours.note, href: yours.href, createdAt: yours.createdAt }
            : null
        }
      />
      <p className="guide-cta">
        <Link className="nav-link" href="/jobs">
          All jobs
        </Link>
        <Link className="nav-link" href="/">
          Home
        </Link>
      </p>
    </main>
    </HouseFloor>
  );
}
