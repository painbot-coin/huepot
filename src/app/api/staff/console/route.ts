import { NextResponse } from "next/server";
import {
  houseWalletStatus,
  inboxHoldings,
  listSweeps,
  listWithdrawals,
  resolveWithdrawal,
  sendQueuedWithdrawal,
  sweepDueInboxes,
} from "@/lib/chain";
import {
  hideReportedChat,
  listReportedPlayers,
  listReports,
  setReportStatus,
} from "@/lib/reports";
import { drainEmails, emailConfigured, outboxSummary } from "@/lib/email";
import { readBooks } from "@/lib/books";
import {
  countHeldNews,
  fetchNewsOnce,
  hideNewsItem,
  listHeldNews,
  listNews,
  releaseAllHeld,
  releaseNewsItem,
} from "@/lib/news";
import { staffKillRound } from "@/lib/game";
import { ensureHouseUser, rakeBps, rakePercentLabel } from "@/lib/house";
import { jsonError } from "@/lib/http";
import { fromCents } from "@/lib/money";
import { withdrawSendEnabled } from "@/lib/config";
import {
  searchStaffUsers,
  staffAdjustBalance,
  staffFreezeUser,
  staffRoomRows,
} from "@/lib/staff";
import { listStaffLogs, writeStaffLog } from "@/lib/staff-log";
import { requireStaff } from "@/lib/staff-auth";
import { withStore, withStoreRead } from "@/lib/store";
import type { Tx } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireStaff(request);
    const url = new URL(request.url);
    const tab = url.searchParams.get("tab") ?? "players";
    const q = url.searchParams.get("q") ?? "";
    const house = await withStore((store) => {
      const user = ensureHouseUser(store);
      return {
        balance: fromCents(user.balance),
        rakeBps: rakeBps(),
        percent: rakePercentLabel(),
      };
    });
    const you = { operator: actor.operator, ip: actor.ip };
    if (tab === "log") {
      return NextResponse.json({ logs: await listStaffLogs(), house, you });
    }
    if (tab === "payouts") {
      return NextResponse.json({
        withdrawals: await listWithdrawals(),
        house,
        treasury: await houseWalletStatus(),
        inboxes: await inboxHoldings(),
        sweeps: await listSweeps(),
        canSend: withdrawSendEnabled(),
        you,
      });
    }
    if (tab === "tables") {
      const rooms = await withStoreRead((store) => staffRoomRows(store));
      return NextResponse.json({ rooms, house, you });
    }
    if (tab === "reports") {
      return NextResponse.json({
        reports: await listReports(),
        reported: await listReportedPlayers(),
        house,
        you,
      });
    }
    if (tab === "wire") {
      return NextResponse.json({
        // What is actually on the wire, since that is now the normal state.
        live: await listNews(40),
        // Only ever non-empty for rows left over from when publishing was gated.
        held: await listHeldNews(),
        heldCount: await countHeldNews(),
        house,
        you,
      });
    }
    if (tab === "books") {
      // Undelivered receipts belong beside the money they describe.
      return NextResponse.json({
        books: await readBooks(),
        mail: await outboxSummary(),
        emailOn: emailConfigured(),
        house,
        you,
      });
    }
    if (tab === "ledger") {
      const txs = await withStoreRead((store) =>
        store.txs.slice(0, 80).map((tx): Tx & { username?: string } => ({
          ...tx,
          amount: fromCents(tx.amount),
          username: store.users[tx.playerId]?.username,
        })),
      );
      return NextResponse.json({ txs, house, you });
    }
    const users = await withStoreRead((store) => searchStaffUsers(store, q));
    return NextResponse.json({ users, house, you });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireStaff(request);
    const body = (await request.json()) as {
      action?: string;
      userId?: string;
      slug?: string;
      amount?: number;
      note?: string;
      id?: string;
    };
    if (body.action === "sweep") {
      const sweeps = await sweepDueInboxes();
      const moved = sweeps.filter((item) => item.ok).length;
      await writeStaffLog(actor, "sweep", "inboxes", moved ? `Moved ${moved} inbox${moved === 1 ? "" : "es"}` : "No inbox USDT to move");
      return NextResponse.json({
        withdrawals: await listWithdrawals(),
        treasury: await houseWalletStatus(),
        inboxes: await inboxHoldings(),
        sweeps: await listSweeps(),
      });
    }
    if (body.action === "send") {
      if (!body.id) throw new Error("Pick a payout.");
      await sendQueuedWithdrawal(body.id);
      await writeStaffLog(actor, "send", body.id, "On-chain USDT send");
      return NextResponse.json({ withdrawals: await listWithdrawals() });
    }
    if (body.action === "mail-drain") {
      // The drainer runs on its own every minute; this is for when someone is
      // watching and wants a stuck receipt retried now.
      const result = await drainEmails(50);
      await writeStaffLog(actor, "mail-drain", "outbox", `${result.sent} sent, ${result.failed} failed`);
      return NextResponse.json({ mail: await outboxSummary(), drained: result });
    }
    if (body.action === "paid" || body.action === "rejected") {
      if (!body.id) throw new Error("Pick a payout.");
      await resolveWithdrawal(body.id, body.action);
      await writeStaffLog(actor, body.action, body.id, body.action === "paid" ? "Marked paid" : "Rejected and refunded");
      return NextResponse.json({ withdrawals: await listWithdrawals() });
    }
    if (body.action === "freeze" || body.action === "unfreeze") {
      if (!body.userId) throw new Error("Pick a player.");
      const users = await withStore((store) => {
        staffFreezeUser(store, body.userId!, body.note ?? "", body.action === "freeze");
        const user = store.users[body.userId!];
        return searchStaffUsers(store, user?.username ?? body.userId!);
      });
      await writeStaffLog(actor, body.action, body.userId, body.note ?? "");
      return NextResponse.json({ users });
    }
    if (body.action === "adjust") {
      if (!body.userId) throw new Error("Pick a player.");
      const users = await withStore((store) => {
        staffAdjustBalance(store, body.userId!, Number(body.amount), body.note ?? "");
        const user = store.users[body.userId!];
        return searchStaffUsers(store, user?.username ?? body.userId!);
      });
      await writeStaffLog(actor, "adjust", body.userId, `${body.amount} · ${body.note ?? ""}`);
      return NextResponse.json({ users });
    }
    if (body.action === "hide-report" || body.action === "dismiss-report") {
      if (!body.id) throw new Error("Pick a report.");
      const reports = await listReports();
      const row = reports.find((item) => item.id === body.id);
      if (!row) throw new Error("That report was not found.");
      if (body.action === "hide-report") {
        await withStore((store) => {
          hideReportedChat(store, row.roomSlug, row.eventId);
        });
        await setReportStatus(row.id, "hidden");
      } else {
        await setReportStatus(row.id, "dismissed");
      }
      await writeStaffLog(actor, body.action, body.id, `/${row.roomSlug}`);
      return NextResponse.json({
        reports: await listReports(),
        reported: await listReportedPlayers(),
      });
    }
    if (
      body.action === "wire-publish" ||
      body.action === "wire-publish-all" ||
      body.action === "wire-drop" ||
      body.action === "wire-fetch"
    ) {
      if (body.action === "wire-fetch") {
        await fetchNewsOnce();
      } else if (body.action === "wire-publish-all") {
        const moved = await releaseAllHeld();
        await writeStaffLog(actor, "wire-publish-all", "backlog", `${moved} released`);
      } else {
        if (!body.id) throw new Error("Pick a headline.");
        if (body.action === "wire-publish") await releaseNewsItem(body.id);
        else await hideNewsItem(body.id);
        await writeStaffLog(actor, body.action, body.id, "");
      }
      return NextResponse.json({
        live: await listNews(40),
        held: await listHeldNews(),
        heldCount: await countHeldNews(),
      });
    }
    if (body.action === "kill") {
      if (!body.slug) throw new Error("Pick a table.");
      const rooms = await withStore((store) => {
        staffKillRound(store, body.slug!);
        return staffRoomRows(store);
      });
      await writeStaffLog(actor, "kill", body.slug, "Voided live round");
      return NextResponse.json({ rooms });
    }
    throw new Error("Pick a staff action.");
  } catch (error) {
    return jsonError(error);
  }
}
