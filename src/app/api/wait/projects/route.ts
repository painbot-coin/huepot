import { NextResponse } from "next/server";
import { getSessionToken, requireUser, userFromToken } from "@/lib/auth";
import { seatOf } from "@/lib/house-seats";
import { jsonError } from "@/lib/http";
import {
  addProject,
  buyProject,
  canOpenProject,
  dropProject,
  grantProject,
  listProjects,
  listPublicProjects,
  ownedProjects,
  paidProjectInStore,
  paidProjectOnBooks,
} from "@/lib/seat-projects";
import { withStore, withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const token = await getSessionToken();
    const seat = seatOf(new URL(request.url).searchParams.get("seat") || "");
    const payload = await withStoreRead(async (store) => {
      const user = userFromToken(store, token);
      const projects = await listPublicProjects(store, user?.id, seat);
      return {
        projects,
        signedIn: Boolean(user),
        balanceCents: user?.balance ?? 0,
      };
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const body = (await request.json()) as {
      action?: string;
      id?: string;
      name?: string;
      how?: string;
      href?: string;
      seat?: string;
      priceCents?: number;
    };
    const payload = await withStore(async (store) => {
      const user = requireUser(store, token);
      if (body.action === "drop") {
        await dropProject(user, body.id ?? "");
      } else if (body.action === "buy") {
        const rows = await listProjects();
        const row = rows.find((item) => item.id === (body.id ?? "").trim());
        if (!row) {
          const error = new Error("That project is not on the shelf.");
          (error as Error & { status?: number }).status = 400;
          throw error;
        }
        let owned = await ownedProjects(user.id);
        if (row.priceCents > 0 && !owned.includes(row.id)) {
          if (paidProjectInStore(store, user.id, row.id) || (await paidProjectOnBooks(user.id, row.id))) {
            owned = [...owned, row.id];
          } else {
            owned = buyProject(store, user, row, owned);
          }
        }
        if (!canOpenProject(row, owned)) {
          const error = new Error("Sign in to take a priced door home.");
          (error as Error & { status?: number }).status = 401;
          throw error;
        }
        return {
          href: row.href,
          id: row.id,
          name: row.name,
          grant: row.priceCents > 0,
          userId: user.id,
          projects: await listPublicProjects(store, user.id),
          signedIn: true,
          balanceCents: user.balance,
        };
      } else {
        await addProject(user, body);
      }
      return {
        projects: await listPublicProjects(store, user.id),
        signedIn: true,
        balanceCents: user.balance,
      };
    });
    if ("grant" in payload && payload.grant && payload.userId && payload.id) {
      await grantProject(payload.userId, payload.id);
      payload.projects = await withStoreRead((store) => listPublicProjects(store, payload.userId));
    }
    if ("grant" in payload) {
      delete payload.grant;
      delete payload.userId;
    }
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
