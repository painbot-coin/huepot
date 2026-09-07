import { NextResponse } from "next/server";
import { accountExport } from "@/lib/account-export";
import { getSessionToken, requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getSessionToken();
    const { payload, username } = await withStoreRead(async (store) => {
      const user = requireUser(store, token);
      return { payload: await accountExport(store, user), username: user.username };
    });
    const day = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        // Offered as a file, since this is meant to be kept rather than read
        // in a browser tab.
        "content-disposition": `attachment; filename="huepot-${username}-${day}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
