import type { WithdrawalStatus } from "@/lib/types";

/** What a person reads on a cash-out. The ledger status stays the same word underneath. */
export function cashOutWord(status: WithdrawalStatus) {
  if (status === "queued") return "Waiting";
  if (status === "sending") return "Sending";
  if (status === "paid") return "Sent";
  return "Returned";
}
