import { NextResponse } from "next/server";
import { getSessionToken, requireUser, userFromToken } from "@/lib/auth";
import { joinCircle, leaveCircle, listOpenCircles } from "@/lib/circle-ledger";
import { isHouseUser } from "@/lib/house";
import { jsonError } from "@/lib/http";
import { withStore, withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getSessionToken();
    const payload = await withStoreRead((store) => {
      const user = userFromToken(store, token);
      return listOpenCircles(store).then((circles) => ({
        circles,
        you: user && !isHouseUser(user) ? user.id : "",
      }));
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const body = (await request.json().catch(() => ({}))) as { action?: string; id?: string };
    const action = body.action === "leave" ? "leave" : "join";
    const id = body.id ?? "";
    const payload = await withStore(async (store) => {
      const user = requireUser(store, token);
      if (isHouseUser(user)) throw new Error("The house does not sit this room.");
      const circle = action === "leave" ? await leaveCircle(user.id, id) : await joinCircle(user.id, id);
      return { circle, circles: await listOpenCircles(store) };
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
