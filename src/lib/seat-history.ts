/**
 * History is the takes, the owned files, and the finished applications.
 * HUE stays the standing. This list is not a second lifetime number.
 */

import { deskHref } from "@/lib/house-mark-list";
import { bidStatusOf, jobById, type HouseBid } from "@/lib/house-jobs";

export type HistoryLine = {
  id: string;
  title: string;
  href: string;
  kind: "take" | "file" | "application";
};

export function seatHistory(input: {
  takes?: { id: string; names: string; roomName: string }[];
  files?: { id: string; name: string }[];
  applications?: HouseBid[];
}) {
  const takes: HistoryLine[] = (input.takes ?? []).map((take) => ({
    id: take.id,
    title: `${take.names} · ${take.roomName}`,
    href: `/take/${take.id}`,
    kind: "take",
  }));
  const files: HistoryLine[] = (input.files ?? []).map((file) => ({
    id: file.id,
    title: file.name,
    href: deskHref(file.id),
    kind: "file",
  }));
  const applications: HistoryLine[] = [];
  for (const row of input.applications ?? []) {
    const status = bidStatusOf(row);
    if (status === "open") continue;
    const title = jobById(row.jobId)?.title ?? row.jobId;
    applications.push({
      id: row.id,
      title: status === "passed" ? `${title} · passed` : `${title} · shortlist`,
      href: `/jobs/${row.jobId}`,
      kind: "application",
    });
  }
  return { takes, files, applications, secondNumber: false as const };
}
