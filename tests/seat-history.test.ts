import assert from "node:assert/strict";
import test from "node:test";
import { seatHistory } from "@/lib/seat-history";
import type { HouseBid } from "@/lib/house-jobs";

function bid(status: HouseBid["status"], jobId = "design"): HouseBid {
  return {
    id: `${jobId}-${status}`,
    jobId,
    userId: "ada",
    username: "ada",
    seat: "game",
    note: "private note that must stay off the history",
    href: "https://huepot.net/wait",
    createdAt: 1,
    status,
  };
}

test("history is takes, files, and finished applications, not a second number", () => {
  const history = seatHistory({
    takes: [{ id: "t1", names: "Volt", roomName: "Classic Pit" }],
    files: [{ id: "wait-down", name: "Downstacker" }],
    applications: [bid("open"), bid("passed"), bid("shortlist", "ml")],
  });
  assert.equal(history.secondNumber, false);
  assert.deepEqual(
    history.takes.map((row) => row.href),
    ["/take/t1"],
  );
  assert.equal(history.files[0]?.href, "/wait?sit=wait-down");
  assert.deepEqual(
    history.applications.map((row) => row.title),
    ["UI/UX designer · passed", "Machine learning engineer · shortlist"],
  );
  assert.equal(JSON.stringify(history).includes("private note"), false);
  assert.equal(JSON.stringify(history).includes("balance"), false);
  const empty = seatHistory({});
  assert.equal(empty.takes.length + empty.files.length + empty.applications.length, 0);
});
