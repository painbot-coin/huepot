import { HouseButton } from "@/components/HouseUi";
import type { Metadata } from "next";
import Link from "next/link";
import { HouseFloor } from "@/components/HouseFloor";
import { requirePageUser } from "@/lib/auth";
import { yourApplications } from "@/lib/house-job-bids";
import { floorYou } from "@/lib/house-you";
import { PAGE } from "@/lib/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: PAGE.applications,
  description: "Jobs you have applied for at Huepot. Update or withdraw from the job.",
};

function ago(at: number) {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function YourApplicationsPage() {
  const user = await requirePageUser("/jobs/you");
  const rows = await yourApplications(user.id);

  return (
    <HouseFloor
      extra={[{ href: "/jobs/you", label: PAGE.applications, match: true }]}
      kicker="Jobs"
      side={
        <div>
          <p className="lobby-label">{PAGE.applications}</p>
          <p className="account-note">
            Huepot reads these. Update or withdraw from the job. USDT is not a
            hiring budget.
          </p>
          <div className="li-profile-act">
            <HouseButton href="/jobs">
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
        <h1 className="font-display text-4xl text-white">{PAGE.applications}</h1>
        <p className="app-lead">
          {rows.length
            ? `${rows.length} application${rows.length === 1 ? "" : "s"} Huepot can read.`
            : "You have not applied yet. Read a job, then apply from an account."}
        </p>
        {rows.length ? (
          <ul className="house-posts">
            {rows.map((row) => (
              <li className="li-card house-post" key={row.id}>
                <p className="house-post-meta">
                  <span>{ago(row.createdAt)}</span>
                </p>
                <h2>
                  <Link href={`/jobs/${row.jobId}`}>{row.title}</Link>
                </h2>
                <p>{row.note}</p>
                {row.href ? (
                  <p className="house-app-link">
                    <a href={row.href} rel="noreferrer noopener">
                      Portfolio
                    </a>
                  </p>
                ) : null}
                <p className="guide-cta">
                  <HouseButton href={`/jobs/${row.jobId}`}>
                    Open application
                  </HouseButton>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="guide-cta">
            <HouseButton href="/jobs">
              Browse jobs
            </HouseButton>
          </p>
        )}
      </main>
    </HouseFloor>
  );
}
