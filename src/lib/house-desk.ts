/**
 * Manager desk snapshot. Visitors are the cookie tape. Accounts are seats.
 * Open reports come from the same ChatReport queue staff already reads.
 */

import { listManageApplications } from "@/lib/house-job-bids";
import { countLiveSeats } from "@/lib/house-managers";
import { readDeskTraffic } from "@/lib/house-visits";
import { countOpenReports, deskReportOf, listReportedPlayers, listReports } from "@/lib/reports";
import { withStoreRead } from "@/lib/store";

export async function loadDeskTraffic() {
  const rows = await listManageApplications();
  const accounts = await withStoreRead((store) => countLiveSeats(store));
  return readDeskTraffic({
    accounts,
    applications: rows.length,
    openApplications: rows.filter((row) => row.status === "open").length,
    openReports: await countOpenReports(),
  });
}

export async function loadDeskReports() {
  return {
    reports: (await listReports()).map(deskReportOf),
    reported: await listReportedPlayers(),
  };
}
