import { HouseButton, PageHead } from "@/components/HouseUi";
import { JobDeskShare } from "@/components/JobDeskShare";
import type { Metadata } from "next";
import Link from "next/link";
import { HouseFloor } from "@/components/HouseFloor";
import { getHeaderUser } from "@/lib/auth";
import { floorYou } from "@/lib/house-you";
import { bidCounts, yourApplications, yourBids } from "@/lib/house-job-bids";
import { deskWork, jobSeatLabel, listHouseJobs, type HouseBid } from "@/lib/house-jobs";
import { seatTag } from "@/lib/house-seats";
import { listPublicProjects } from "@/lib/seat-projects";
import { withStoreRead } from "@/lib/store";
import { PAGE } from "@/lib/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jobs",
  description:
    "Work Huepot is looking for. UI/UX, backend, architect, ML, marketing, and the four roles. Read free. Apply from an account.",
};

export default async function JobsPage() {
  const user = await getHeaderUser();
  const [jobs, counts, yours, mine, shared] = await Promise.all([
    listHouseJobs(),
    bidCounts(),
    user ? yourBids(user.id) : Promise.resolve({} as Record<string, HouseBid>),
    user ? yourApplications(user.id) : Promise.resolve([]),
    withStoreRead(async (store) => deskWork(await listPublicProjects(store, user?.id))),
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
            Jobs stay the house desk. A seat can share a project. Read free.
            Apply from an account. USDT is not a wage. Gold is not a milestone.
            The pot stays on Classic.
          </p>
          <div className="li-profile-act">
            {user ? (
              <HouseButton ghost href="/jobs/you">
                {PAGE.applications}
                {mine.length ? ` · ${mine.length}` : ""}
              </HouseButton>
            ) : null}
            {user?.manager || user?.reviewer ? (
              <HouseButton href="/manage">
                {PAGE.manage}
              </HouseButton>
            ) : !user ? (
              <HouseButton href="/signin?next=/jobs">
                Create an account
              </HouseButton>
            ) : null}
            <HouseButton ghost href="/wait/store">
              Store
            </HouseButton>
          </div>
        </div>
      }
      you={floorYou(user)}
    >
    <main className="app-page is-in-floor">
      <PageHead
        lead="Huepot still needs a UI/UX designer, backend engineer, system architect, machine learning engineer, and marketing specialist. Read free. Apply from an account. A seat can share a project on this desk."
        title="Work at Huepot"
      />
      <ul className="house-posts">
        {jobs.map((job) => {
          const n = counts[job.id] ?? 0;
          const mine = Boolean(yours[job.id]);
          return (
            <li className="li-card house-post" key={job.id}>
              <p className="house-post-meta">
                <span>{jobSeatLabel(job.seat)}</span>
                <span>
                  {n} application{n === 1 ? "" : "s"}
                  {mine ? " · you applied" : ""}
                </span>
              </p>
              <h2>
                <Link href={`/jobs/${job.id}`}>{job.title}</Link>
              </h2>
              <p>{job.need}</p>
              <p className="guide-cta">
                <HouseButton href={`/jobs/${job.id}`}>
                  {mine ? "Your application" : "Read the job"}
                </HouseButton>
              </p>
            </li>
          );
        })}
      </ul>
      <h2 className="font-display text-2xl text-white">A seat&apos;s project</h2>
      <p className="app-lead">
        A seat can share a project. Read free. USDT is not a wage. Gold is not a milestone.
      </p>
      {shared.length === 0 ? (
        <p className="account-note">No seat has shared a project yet. The house does not add one.</p>
      ) : (
        <ul className="house-posts">
          {shared.map((row) => (
            <li className="li-card house-post" key={row.id}>
              <p className="house-post-meta">
                <span>{seatTag(row.seat) || "Seat"}</span>
                <span>
                  <Link href={`/network/u/${encodeURIComponent(row.username)}`}>A seat · @{row.username}</Link>
                </span>
              </p>
              <h2>{row.name}</h2>
              <p>{row.how}</p>
              {row.href ? (
                <p className="house-app-link">
                  <a href={row.href} rel="noreferrer noopener">
                    Open the door
                  </a>
                </p>
              ) : (
                <p className="account-note">The door is on their seat. Gold is not a milestone here.</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <JobDeskShare seat={user?.seat ?? ""} signedIn={Boolean(user)} />
      <p className="app-lead">
        No deposit bonus. Invite is rake share only. USDT is only to buy a
        priced file. The pot stays on Classic.
      </p>
      <p className="guide-cta">
        {user ? (
          <HouseButton href="/jobs/you">
            {PAGE.applications}
          </HouseButton>
        ) : (
          <HouseButton href="/signin?next=/jobs">
            Create an account to apply
          </HouseButton>
        )}
        <Link className="nav-link" href="/how-it-works">
          How it works
        </Link>
      </p>
    </main>
    </HouseFloor>
  );
}
