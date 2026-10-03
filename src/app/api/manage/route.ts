import { NextResponse } from "next/server";
import { getSessionToken, requireUser } from "@/lib/auth";
import { loadDeskReports, loadDeskTraffic } from "@/lib/house-desk";
import { readVisitRoll } from "@/lib/house-visits";
import { listManageApplications, setHouseBidStatus } from "@/lib/house-job-bids";
import { closeDeskSeat, freezeDeskSeat, listDeskPeople, reopenDeskSeat, setDeskCraft, type DeskPerson } from "@/lib/house-people";
import {
  grantManager,
  isManagerUser,
  listManagerNames,
  revokeManager,
} from "@/lib/house-managers";
import {
  canKeepDesk,
  grantReviewer,
  listReviewerNames,
  revokeReviewer,
} from "@/lib/house-reviewers";
import { jsonError } from "@/lib/http";
import { hideReportedChat, listReports, setReportStatus } from "@/lib/reports";
import { hideReportedSocial } from "@/lib/social";
import { ensureInviteCode } from "@/lib/referrals";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";

async function deskPayload(managers: string[], reviewers: string[], people: DeskPerson[] = []) {
  const reports = await loadDeskReports();
  return {
    applications: await listManageApplications(),
    managers,
    reviewers,
    people,
    roll: await readVisitRoll(),
    traffic: await loadDeskTraffic(),
    ...reports,
  };
}

export async function GET() {
  try {
    const token = await getSessionToken();
    const names = await withStore((store) => {
      const user = requireUser(store, token);
      if (!canKeepDesk(user)) {
        const error = new Error("This desk is for Huepot managers and the report roster.");
        (error as Error & { status?: number }).status = 403;
        throw error;
      }
      return {
        managers: listManagerNames(store),
        reviewers: listReviewerNames(store),
        people: isManagerUser(user) ? listDeskPeople(store) : [],
      };
    });
    return NextResponse.json(await deskPayload(names.managers, names.reviewers, names.people));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      id?: string;
      status?: string;
      username?: string;
      seat?: string;
    };
    const action = (body.action ?? "").trim();

    if (action === "hide-report" || action === "dismiss-report") {
      const names = await withStore((store) => {
        const user = requireUser(store, token);
        if (!canKeepDesk(user)) {
          const error = new Error("This desk is for Huepot managers and the report roster.");
          (error as Error & { status?: number }).status = 403;
          throw error;
        }
        return {
          managers: listManagerNames(store),
          reviewers: listReviewerNames(store),
          people: isManagerUser(user) ? listDeskPeople(store) : [],
        };
      });
      if (!body.id) throw new Error("Pick a report.");
      const reports = await listReports();
      const row = reports.find((item) => item.id === body.id);
      if (!row) throw new Error("That report was not found.");
      if (action === "hide-report") {
        if (row.kind === "chat") {
          await withStore((store) => {
            hideReportedChat(store, row.roomSlug, row.eventId);
          });
        } else {
          await hideReportedSocial(row.kind, row.eventId);
        }
        await setReportStatus(row.id, "hidden");
      } else {
        await setReportStatus(row.id, "dismissed");
      }
      return NextResponse.json(await deskPayload(names.managers, names.reviewers, names.people));
    }

    const payload = await withStore(async (store) => {
      const user = requireUser(store, token);
      if (!canKeepDesk(user)) {
        const error = new Error("This desk is for Huepot managers and the report roster.");
        (error as Error & { status?: number }).status = 403;
        throw error;
      }
      if (action === "status") {
        if (!isManagerUser(user)) throw new Error("Hiring is for managers.");
        await setHouseBidStatus(body.id ?? "", body.status);
      } else if (action === "roster") {
        if (!isManagerUser(user)) throw new Error("Only a manager can add a manager.");
        grantManager(store, body.username ?? "");
      } else if (action === "unroster") {
        if (!isManagerUser(user)) throw new Error("Only a manager can remove a manager.");
        if ((body.username ?? "").trim().toLowerCase() === user.username.toLowerCase()) {
          throw new Error("Ask another manager to remove you.");
        }
        revokeManager(store, body.username ?? "");
      } else if (action === "roster-review") {
        if (!isManagerUser(user)) throw new Error("Only a manager can add a reviewer.");
        grantReviewer(store, body.username ?? "");
      } else if (action === "unroster-review") {
        if (!isManagerUser(user)) throw new Error("Only a manager can remove a reviewer.");
        if ((body.username ?? "").trim().toLowerCase() === user.username.toLowerCase()) {
          throw new Error("Ask another manager to remove you.");
        }
        revokeReviewer(store, body.username ?? "");
      } else if (action === "craft") {
        setDeskCraft(store, user, body.username ?? "", body.seat ?? "");
      } else if (action === "close") {
        closeDeskSeat(store, user, body.username ?? "");
      } else if (action === "reopen") {
        reopenDeskSeat(store, user, body.username ?? "");
      } else if (action === "freeze" || action === "unfreeze") {
        freezeDeskSeat(store, user, body.username ?? "", action === "freeze");
      } else if (action === "invite") {
        if (!isManagerUser(user)) throw new Error("Only a manager can make an invite.");
        const seat = Object.values(store.users).find(
          (row) => row.username.toLowerCase() === (body.username ?? "").trim().toLowerCase(),
        );
        if (!seat) throw new Error("That account was not found.");
        ensureInviteCode(store, seat);
      } else {
        throw new Error("Pick a manage action.");
      }
      return {
        managers: listManagerNames(store),
        reviewers: listReviewerNames(store),
        people: isManagerUser(user) ? listDeskPeople(store) : [],
      };
    });
    return NextResponse.json(await deskPayload(payload.managers, payload.reviewers, payload.people));
  } catch (error) {
    return jsonError(error);
  }
}
