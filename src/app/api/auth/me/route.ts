import { NextResponse } from "next/server";
import {
  getSessionToken,
  toPublicUser,
  userFromToken,
} from "@/lib/auth";
import { ensureSitChips } from "@/lib/bonus";
import { listCompanySitting } from "@/lib/company-sit";
import { prisma } from "@/lib/db";
import { readyFriends } from "@/lib/friends";
import { jsonError } from "@/lib/http";
import { ensureInviteCode } from "@/lib/referrals";
import { withStore } from "@/lib/store";
import type { Tx } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const lite = new URL(request.url).searchParams.get("lite") === "1";
    const token = await getSessionToken();
    const payload = await withStore(async (store) => {
      const user = userFromToken(store, token);
      if (!user) return { user: null, companySitting: [] };
      ensureInviteCode(store, user);
      await ensureSitChips(store, user);
      if (lite) {
        await readyFriends();
        return {
          user: toPublicUser(user, [], store),
          companySitting: listCompanySitting(store, user.id),
        };
      }
      const rows = await prisma.$queryRawUnsafe<
        {
          id: string;
          playerId: string;
          type: string;
          amount: number;
          createdAt: number | bigint;
          note: string;
        }[]
      >(
        `SELECT id, playerId, type, amount, CAST(createdAt AS TEXT) as createdAt, note FROM Tx WHERE playerId = '${user.id.replace(/'/g, "''")}' ORDER BY createdAt DESC LIMIT 400`,
      );
      const txs: Tx[] = rows.map((row) => ({
        id: row.id,
        playerId: row.playerId,
        type: row.type as Tx["type"],
        amount: row.amount,
        createdAt: Number(row.createdAt),
        note: row.note,
      }));
      return { user: toPublicUser(user, txs, store) };
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
