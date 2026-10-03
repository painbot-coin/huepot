import { NextResponse } from "next/server";
import { getSessionToken, requireUser, userFromToken } from "@/lib/auth";
import { bidCount, bidForUserJob, placeHouseBid, takeHouseBid } from "@/lib/house-job-bids";
import { jobById, publicBid } from "@/lib/house-jobs";
import { jsonError } from "@/lib/http";
import { withStore, withStoreRead } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const job = jobById(id);
    if (!job) {
      return NextResponse.json({ error: "That job was not found." }, { status: 404 });
    }
    const token = await getSessionToken();
    const user = await withStoreRead((store) => userFromToken(store, token));
    const yours = user ? await bidForUserJob(user.id, job.id) : null;
    return NextResponse.json({
      job,
      bids: await bidCount(job.id),
      signedIn: Boolean(user),
      yours: yours ? publicBid(yours) : null,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const token = await getSessionToken();
    const body = (await request.json().catch(() => ({}))) as {
      note?: unknown;
      href?: unknown;
    };
    const bid = await withStore(async (store) => {
      const user = requireUser(store, token);
      return placeHouseBid(store, user, id, body.note, body.href);
    });
    return NextResponse.json({ yours: publicBid(bid), bids: await bidCount(id) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const token = await getSessionToken();
    await withStore(async (store) => {
      const user = requireUser(store, token);
      await takeHouseBid(store, user, id);
    });
    return NextResponse.json({ yours: null, bids: await bidCount(id) });
  } catch (error) {
    return jsonError(error);
  }
}
