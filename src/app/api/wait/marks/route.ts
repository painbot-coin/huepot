import { NextResponse } from "next/server";
import { getSessionToken, userFromToken } from "@/lib/auth";
import {
  canDownloadWeights,
  canPlayMark,
  canWatchMark,
  markById,
  publicMarks,
  weightsFor,
} from "@/lib/house-mark-list";
import { bookLabel, booksOnOneSit, pairLine, pairRecord } from "@/lib/book-pair";
import { agentSits, shelfSeed, shelfSit, watchMarkSit } from "@/lib/lab-watch";
import { stackStyleByMark } from "@/lib/tetris-style";
import type { BookSnap, PublicMark } from "@/lib/house-mark-list";
import { buyMark, grantMark, ownedMarks, paidMarkInStore, paidMarkOnBooks } from "@/lib/house-marks";
import { jsonError } from "@/lib/http";
import { withStore, withStoreRead } from "@/lib/store";
import { snapshotLabs } from "@/lib/lab-stack";
import { snapshotStack } from "@/lib/tetris-stack";

function stampShelf(marks: PublicMark[], snaps: Record<string, BookSnap>) {
  return marks.map((mark) => {
    const weights = weightsFor(mark.id, snaps);
    if (!weights) return mark;
    const sit = shelfSit(mark.id, weights);
    if (!sit) return mark;
    return { ...mark, watchScore: sit.score, watchNote: sit.note };
  });
}

function fileSit(id: string, kind: string, snaps: Record<string, BookSnap>) {
  const weights = weightsFor(id, snaps);
  const sit = weights ? shelfSit(id, weights) : null;
  return {
    weights,
    score: sit?.score,
    watchNote: sit?.note ?? "",
    style: kind === "wait" ? stackStyleByMark(id).id : "",
  };
}

async function liveSnaps() {
  const [stack, labs] = await Promise.all([snapshotStack(), snapshotLabs()]);
  return {
    "wait-live": stack,
    "catch-live": labs.catch,
    "snake-live": labs.snake,
    "aim-live": labs.aim,
    "lane-live": labs.lane,
    "break-live": labs.break,
  };
}

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const pairId = new URL(request.url).searchParams.get("pair") ?? "";
    const token = await getSessionToken();
    const snaps = await liveSnaps();
    const sits = agentSits((id) => weightsFor(id, snaps));
    const books = booksOnOneSit(pairId);
    let pair: {
      person: { id: string; label: string; score: number };
      house: { id: string; label: string; score: number };
      lead: string;
      line: string;
      wallet: false;
    } | null = null;
    if (books) {
      const seed = shelfSeed(`${books.person}:${books.house}`);
      const personWeights = weightsFor(books.person, snaps);
      const houseWeights = weightsFor(books.house, snaps);
      const personSit = personWeights ? watchMarkSit(books.person, personWeights, seed) : null;
      const houseSit = houseWeights ? watchMarkSit(books.house, houseWeights, seed) : null;
      const record =
        personSit && houseSit ? pairRecord(personSit.score, houseSit.score) : null;
      if (record) {
        pair = {
          person: { id: books.person, label: bookLabel(books.person), score: record.personScore },
          house: { id: books.house, label: bookLabel(books.house), score: record.houseScore },
          lead: record.lead,
          line: pairLine(record.lead),
          wallet: false,
        };
      }
    }
    const data = await withStoreRead(async (store) => {
      const user = userFromToken(store, token);
      const owned = user ? await ownedMarks(user.id) : [];
      const ownedSet = new Set(owned);
      return {
        marks: stampShelf(publicMarks(owned, snaps), snaps),
        agents: sits.map((sit) => ({
          ...sit,
          owned: sit.priceCents <= 0 || ownedSet.has(sit.id),
        })),
        pair,
        owned,
        signedIn: Boolean(user),
        balanceCents: user?.balance ?? 0,
      };
    });
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { id?: unknown; take?: unknown };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const take = body.take === "download" ? "download" : body.take === "watch" ? "watch" : "play";
    const mark = markById(id);
    if (!mark) {
      return NextResponse.json({ error: "That mark is not on the shelf." }, { status: 400 });
    }
    const token = await getSessionToken();
    const snaps = await liveSnaps();

    if (take === "watch") {
      if (!canWatchMark(mark)) {
        return NextResponse.json(
          { error: "That sit is not on the table yet.", id: mark.id, coming: true },
          { status: 400 },
        );
      }
      const weights = weightsFor(mark.id, snaps);
      if (!weights) {
        return NextResponse.json({ error: "That mark has no sit yet." }, { status: 400 });
      }
      const sit = watchMarkSit(mark.id, weights, shelfSeed(mark.id));
      if (!sit) {
        return NextResponse.json({ error: "That sit could not play." }, { status: 400 });
      }
      const user = await withStoreRead((store) => userFromToken(store, token));
      const owned = user ? await ownedMarks(user.id) : [];
      return NextResponse.json({
        marks: publicMarks(owned, snaps),
        owned,
        signedIn: Boolean(user),
        balanceCents: user?.balance ?? 0,
        id: mark.id,
        name: mark.name,
        kind: mark.kind,
        desk: mark.desk,
        how: mark.how,
        score: sit.score,
        steps: sit.steps,
        frames: sit.frames,
      });
    }

    if (take === "play") {
      if (!canPlayMark(mark)) {
        return NextResponse.json(
          { error: "That game is not on the table yet.", id: mark.id, coming: true },
          { status: 400 },
        );
      }
      const weights = weightsFor(mark.id, snaps);
      if (!weights) {
        return NextResponse.json({ error: "That mark has no sit yet." }, { status: 400 });
      }
      const user = await withStoreRead((store) => userFromToken(store, token));
      const owned = user ? await ownedMarks(user.id) : [];
      return NextResponse.json({
        marks: publicMarks(owned, snaps),
        owned,
        signedIn: Boolean(user),
        balanceCents: user?.balance ?? 0,
        id: mark.id,
        name: mark.name,
        kind: mark.kind,
        desk: mark.desk,
        version: mark.version,
        playerType: mark.playerType,
        how: mark.how,
        games: mark.games,
        features: mark.features,
        weights,
      });
    }

    const result = await withStore(async (store) => {
      const user = userFromToken(store, token);
      let owned = user ? await ownedMarks(user.id) : [];
      if (mark.priceCents > 0 && mark.status === "live" && !owned.includes(mark.id)) {
        if (!user) {
          const error = new Error("Sign in to take a priced book home.");
          (error as Error & { status?: number }).status = 401;
          throw error;
        }
        if (paidMarkInStore(store, user.id, mark.id) || (await paidMarkOnBooks(user.id, mark.id))) {
          owned = [...owned, mark.id];
        } else {
          owned = buyMark(store, user, mark, owned);
        }
      }
      if (!canDownloadWeights(mark, owned)) {
        const error = new Error(
          mark.status === "coming" ? "That mark is not on the table yet." : "Sign in to take a priced book home.",
        );
        (error as Error & { status?: number }).status = mark.status === "coming" ? 400 : 401;
        throw error;
      }
      const file = fileSit(mark.id, mark.kind, snaps);
      if (!file.weights) {
        const error = new Error("That mark has no sit yet.");
        (error as Error & { status?: number }).status = 400;
        throw error;
      }
      return {
        marks: stampShelf(publicMarks(owned, snaps), snaps),
        owned,
        signedIn: Boolean(user),
        balanceCents: user?.balance ?? 0,
        id: mark.id,
        name: mark.name,
        kind: mark.kind,
        desk: mark.desk,
        version: mark.version,
        playerType: mark.playerType,
        how: mark.how,
        games: mark.games,
        features: mark.features,
        weights: file.weights,
        score: file.score,
        watchNote: file.watchNote,
        style: file.style,
        grant: Boolean(user && mark.priceCents > 0 && mark.status === "live"),
        userId: user?.id ?? "",
      };
    });
    if (result.grant && result.userId) {
      result.owned = await grantMark(result.userId, mark.id);
      result.marks = stampShelf(publicMarks(result.owned, snaps), snaps);
    }
    const { grant: _grant, userId: _userId, ...reply } = result;
    return NextResponse.json(reply);
  } catch (error) {
    return jsonError(error);
  }
}
