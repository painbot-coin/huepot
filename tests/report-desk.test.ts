import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  countOpenReportsOf,
  deskReportOf,
  hideReportLabel,
  reportReply,
  reportedPlayersOf,
  reportWhere,
  type DeskReportRow,
} from "@/lib/report-desk";
import { hideReportedChat, reportChat } from "@/lib/reports";
import type { StoreData } from "@/lib/types";

function row(extra: Partial<DeskReportRow> = {}): DeskReportRow {
  return {
    id: extra.id ?? "r1",
    kind: extra.kind ?? "chat",
    roomSlug: extra.roomSlug ?? "classic",
    eventId: extra.eventId ?? "e1",
    reporterId: extra.reporterId ?? "rep1",
    username: extra.username ?? "rio",
    body: extra.body ?? "hey",
    createdAt: extra.createdAt ?? 10,
    status: extra.status ?? "open",
  };
}

function storeOf() {
  return {
    rooms: {
      classic: {
        events: [
          { id: "e1", kind: "chat", userId: "u2", username: "rio", body: "hey", createdAt: 1 },
        ],
        mutedIds: [],
      },
    },
  } as unknown as StoreData;
}

test("the desk names the door, not the raw path", () => {
  assert.equal(reportWhere({ kind: "chat", roomSlug: "classic" }), "/classic");
  assert.equal(reportWhere({ kind: "post", roomSlug: "" }), "Post");
  assert.equal(reportWhere({ kind: "comment", roomSlug: "" }), "Comment");
  assert.equal(reportWhere({ kind: "message", roomSlug: "" }), "Message");
  assert.equal(hideReportLabel("chat"), "Hide + mute");
  assert.equal(hideReportLabel("message"), "Hide");
});

test("the desk never shows who filed", () => {
  const shown = deskReportOf(row({ reporterId: "secret-id" }));
  assert.equal(shown.username, "rio");
  assert.equal("reporterId" in shown, false);
  assert.equal(countOpenReportsOf([row(), row({ status: "hidden" })]), 1);
});

test("one irritated player is not a pattern", () => {
  const named = reportedPlayersOf([
    row({ id: "a", reporterId: "p1", createdAt: 1 }),
    row({ id: "b", reporterId: "p1", createdAt: 2 }),
    row({ id: "c", reporterId: "p2", username: "lea", createdAt: 3 }),
    row({ id: "d", reporterId: "p3", username: "lea", createdAt: 4 }),
  ]);
  assert.equal(named[0]?.username, "lea");
  assert.equal(named[0]?.reporters, 2);
  assert.equal(named[1]?.username, "rio");
  assert.equal(named[1]?.reporters, 1);
});

test("a reporter hears kept or dismissed", () => {
  assert.equal(reportReply(true).title, "Report kept");
  assert.match(reportReply(true).body, /hid that writing/);
  assert.equal(reportReply(false).title, "Report dismissed");
  assert.match(reportReply(false).body, /writing stays/);
});

test("the report desk names who keeps it", () => {
  const desk = readFileSync(new URL("../src/components/ManageReports.tsx", import.meta.url), "utf8");
  assert.match(desk, /Report roster/);
  assert.match(desk, /roster-review/);
  assert.match(desk, /Add a reviewer/);
});

test("you cannot report your own chat, and hide mutes that seat", () => {
  const store = storeOf();
  assert.throws(() => reportChat(store, "classic", "u2", "e1"), /your own/);
  const filed = reportChat(store, "classic", "u1", "e1");
  assert.equal(filed.username, "rio");
  assert.equal(filed.body, "hey");
  hideReportedChat(store, "classic", "e1");
  assert.equal(store.rooms.classic.events[0]?.body, "Removed.");
  assert.deepEqual(store.rooms.classic.mutedIds, ["u2"]);
});
