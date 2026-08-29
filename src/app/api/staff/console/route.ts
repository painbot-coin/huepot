import { NextResponse } from "next/server";
import {
  houseWalletStatus,
  listWithdrawals,
  resolveWithdrawal,
  sendQueuedWithdrawal,
} from "@/lib/chain";
import {
  hideReportedChat,
  listReports,
  setReportStatus,
} from "@/lib/reports";
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
import { requireAdmin } from "@/lib/staff-auth";
import { withStore, withStoreRead } from "@/lib/store";
import type { Tx } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    requireAdmin(request);
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
    if (tab === "payouts") {
      return NextResponse.json({
        withdrawals: await listWithdrawals(),
        house,
        treasury: await houseWalletStatus(),
        canSend: withdrawSendEnabled(),
      });
    }
    if (tab === "tables") {
      const rooms = await withStoreRead((store) => staffRoomRows(store));
      return NextResponse.json({ rooms, house });
    }
    if (tab === "reports") {
      return NextResponse.json({ reports: await listReports(), house });
    }
    if (tab === "ledger") {
      const txs = await withStoreRead((store) =>
        store.txs.slice(0, 80).map((tx): Tx & { username?: string } => ({
          ...tx,
          amount: fromCents(tx.amount),
          username: store.users[tx.playerId]?.username,
        })),
      );
      return NextResponse.json({ txs, house });
    }
    const users = await withStoreRead((store) => searchStaffUsers(store, q));
    return NextResponse.json({ users, house });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const body = (await request.json()) as {
      action?: string;
      userId?: string;
      slug?: string;
      amount?: number;
      note?: string;
      id?: string;
    };
    if (body.action === "send") {
      if (!body.id) throw new Error("Pick a payout.");
      await sendQueuedWithdrawal(body.id);
      return NextResponse.json({ withdrawals: await listWithdrawals() });
    }
    if (body.action === "paid" || body.action === "rejected") {
      if (!body.id) throw new Error("Pick a payout.");
      await resolveWithdrawal(body.id, body.action);
      return NextResponse.json({ withdrawals: await listWithdrawals() });
    }
    if (body.action === "freeze" || body.action === "unfreeze") {
      if (!body.userId) throw new Error("Pick a player.");
      const users = await withStore((store) => {
        staffFreezeUser(store, body.userId!, body.note ?? "", body.action === "freeze");
        const user = store.users[body.userId!];
        return searchStaffUsers(store, user?.username ?? body.userId!);
      });
      return NextResponse.json({ users });
    }
    if (body.action === "adjust") {
      if (!body.userId) throw new Error("Pick a player.");
      const users = await withStore((store) => {
        staffAdjustBalance(store, body.userId!, Number(body.amount), body.note ?? "");
        const user = store.users[body.userId!];
        return searchStaffUsers(store, user?.username ?? body.userId!);
      });
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
      return NextResponse.json({ reports: await listReports() });
    }
    if (body.action === "kill") {
      if (!body.slug) throw new Error("Pick a table.");
      const rooms = await withStore((store) => {
        staffKillRound(store, body.slug!);
        return staffRoomRows(store);
      });
      return NextResponse.json({ rooms });
    }
    throw new Error("Pick a staff action.");
  } catch (error) {
    return jsonError(error);
  }
}
