import type { NoticeKind } from "@/lib/types";

export type NoticeAlert = "ok" | "warn" | "halt" | "note";

/** Four house alerts. Gold in and takes are ok. Cash-out and verify wait. A return halts. */
export function noticeAlert(kind: NoticeKind): NoticeAlert {
  if (kind === "payout" || kind === "deposit" || kind === "verified" || kind === "welcome") return "ok";
  if (kind === "withdraw" || kind === "verify") return "warn";
  if (kind === "refund") return "halt";
  return "note";
}

export function noticeKindLabel(kind: NoticeKind) {
  if (kind === "welcome") return "Welcome";
  if (kind === "verify") return "Verify";
  if (kind === "verified") return "Verified";
  if (kind === "deposit") return "Gold in";
  if (kind === "withdraw") return "Cash out";
  if (kind === "payout") return "Take";
  if (kind === "refund") return "Return";
  if (kind === "friend") return "Company";
  if (kind === "message") return "Message";
  if (kind === "post") return "Talk";
  return "House";
}

export function noticeAlertClass(kind: NoticeKind, read: boolean) {
  const unread = read ? "" : " is-unread";
  return `notice-item notice-alert is-${noticeAlert(kind)} is-${kind}${unread}`;
}
