import { HouseButton } from "@/components/HouseUi";
import type { Metadata } from "next";
import { HouseFloor } from "@/components/HouseFloor";
import { ManageDash } from "@/components/ManageDash";
import { ManageDesk } from "@/components/ManageDesk";
import { ManageReports } from "@/components/ManageReports";
import { getSessionToken, requirePageUser, userFromToken } from "@/lib/auth";
import { loadDeskReports, loadDeskTraffic } from "@/lib/house-desk";
import { readVisitRoll } from "@/lib/house-visits";
import { listManageApplications } from "@/lib/house-job-bids";
import { listDeskPeople, type DeskPerson } from "@/lib/house-people";
import {
  claimFirstManager,
  isManagerUser,
  listManagerNames,
} from "@/lib/house-managers";
import {
  canKeepDesk,
  claimFirstReviewer,
  isReviewerUser,
  listReviewerNames,
} from "@/lib/house-reviewers";
import { floorYou } from "@/lib/house-you";
import { hasStaffSession } from "@/lib/staff-auth";
import { withStore } from "@/lib/store";
import { PAGE } from "@/lib/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: PAGE.manage,
  description: "Huepot desk. Visitors, open reports, and hiring. USDT is not a hiring budget.",
};

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ app?: string; report?: string }>;
}) {
  await requirePageUser("/manage");
  const { app, report } = await searchParams;
  const focus = (app ?? "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80);
  const reportFocus = (report ?? "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80);
  const token = await getSessionToken();
  const staff = await hasStaffSession();
  const gate = await withStore((store) => {
    const user = userFromToken(store, token);
    if (!user) {
      return {
        manager: false,
        reviewer: false,
        desk: false,
        names: [] as string[],
        reviewers: [] as string[],
        people: [] as DeskPerson[],
        username: "",
      };
    }
    claimFirstManager(store, user, staff);
    claimFirstReviewer(store, user, staff || isManagerUser(user));
    return {
      manager: isManagerUser(user),
      reviewer: isReviewerUser(user),
      desk: canKeepDesk(user),
      names: listManagerNames(store),
      reviewers: listReviewerNames(store),
      people: isManagerUser(user) ? listDeskPeople(store) : [],
      username: user.username,
    };
  });
  const you = await requirePageUser("/manage");
  const rows = gate.manager ? await listManageApplications() : [];
  const roll = gate.manager ? await readVisitRoll() : null;
  const traffic = gate.manager ? await loadDeskTraffic() : null;
  const deskReports = gate.desk ? await loadDeskReports() : null;

  return (
    <HouseFloor
      kicker={PAGE.manage}
      side={
        <div>
          <p className="lobby-label">{PAGE.manage}</p>
          {traffic ? (
            <p className="account-note">
              {traffic.now.visitors} live · {traffic.today.visitors} visitors
              today · {traffic.openReports} open report
              {traffic.openReports === 1 ? "" : "s"}. Guests count.
            </p>
          ) : gate.desk && deskReports ? (
            <p className="account-note">
              {deskReports.reports.filter((row) => row.status === "open").length} open
              report
              {deskReports.reports.filter((row) => row.status === "open").length === 1 ? "" : "s"}
              . You keep the report desk.
            </p>
          ) : (
            <p className="account-note">
              Signed-in seats apply on Jobs. Managers read visitors and
              applications. The report roster reads reports. USDT is not a hiring budget.
            </p>
          )}
          <div className="li-profile-act">
            <HouseButton href="/jobs">
              Jobs
            </HouseButton>
            <HouseButton ghost href="/jobs/you">
              {PAGE.applications}
            </HouseButton>
          </div>
        </div>
      }
      you={floorYou({ ...you, manager: gate.manager, reviewer: gate.reviewer })}
    >
      <main className="app-page is-in-floor">
        <p className="hall-kicker">{PAGE.manage}</p>
        <h1 className="font-display text-4xl text-white">Desk</h1>
        {gate.desk && deskReports ? (
          <>
            {traffic && roll ? (
              <>
                <p className="app-lead">
                  Open a number. A signed-in seat can be managed from that list. A guest has no account.
                </p>
                <ManageDash canManage={gate.manager} people={gate.people} roll={roll} traffic={traffic} you={gate.username} />
              </>
            ) : null}
            <h2 className="font-display text-3xl text-white" id="manage-reports">Reports</h2>
            <p className="app-lead">
              {deskReports.reports.filter((row) => row.status === "open").length
                ? "One reporter is not a pattern. Hide what should be hidden. Dismiss noise."
                : "Waiting on the first report. Chat, posts, comments, and messages land here."}
            </p>
            <ManageReports
              focus={reportFocus}
              reported={deskReports.reported}
              reports={deskReports.reports}
              reviewers={gate.reviewers}
              you={gate.username}
              canRoster={gate.manager}
            />
            {gate.manager ? (
              <>
                <h2 className="font-display text-3xl text-white" id="manage-hiring">Hiring</h2>
                <p className="app-lead">
                  {rows.length
                    ? `${rows.length} application${rows.length === 1 ? "" : "s"}. Shortlist or pass. Message from the card.`
                    : "Waiting on the first application."}
                </p>
                <ManageDesk
                  applications={rows}
                  focus={focus}
                  managers={gate.names}
                  you={gate.username}
                />
              </>
            ) : null}
          </>
        ) : (
          <p className="app-lead">
            This desk is for Huepot managers and the report roster. Apply from
            Jobs. Staff can grant the first manager, or a listed manager can add you.
          </p>
        )}
      </main>
    </HouseFloor>
  );
}
