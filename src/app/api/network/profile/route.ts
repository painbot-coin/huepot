import { NextResponse } from "next/server";
import { getSessionToken, requireUser, userFromToken } from "@/lib/auth";
import { boardPlaceFor } from "@/lib/board-sit";
import { companyIds, readyFriends } from "@/lib/friends";
import { jsonError } from "@/lib/http";
import { listHouseBoard, playerRecord } from "@/lib/record";
import { ensureInviteCode } from "@/lib/referrals";
import {
  AUTHOR_PAGE,
  countAuthorPosts,
  deleteSeatNote,
  listAuthorPosts,
  listSeatNotes,
  listSeatRecommended,
  publicProfile,
  readySocial,
  refreshUnread,
  saveProfile,
  saveSeatNote,
  sendMessage,
  youPayload,
} from "@/lib/social";
import { circlesForSeat } from "@/lib/circle-ledger";
import { houseDayPlan } from "@/lib/house-day";
import { yourApplications } from "@/lib/house-job-bids";
import { ownedMarks } from "@/lib/house-marks";
import { seatHistory } from "@/lib/seat-history";
import { companyFaces, othersOnBook, seatJobs } from "@/lib/seat-jobs";
import { publicOwnedBooks, sitParam, weightsFor } from "@/lib/house-mark-list";
import { agentSits } from "@/lib/lab-watch";
import { snapshotLabs } from "@/lib/lab-stack";
import { seatBookFace } from "@/lib/seat-book";
import { snapshotStack } from "@/lib/tetris-stack";
import { isHouseUser } from "@/lib/house";
import { listSeatProjects } from "@/lib/seat-projects";
import { withStore, withStoreRead } from "@/lib/store";
import { listSeatTakes } from "@/lib/takes";

export const runtime = "nodejs";

async function bookFaceFor(book: string, ownedIds: string[], viewerIsSeat: boolean) {
  const id = sitParam(book);
  if (!id) return null;
  const [stack, labs] = await Promise.all([snapshotStack(), snapshotLabs()]);
  const sit = agentSits((markId) =>
    weightsFor(markId, {
      "wait-live": stack,
      "catch-live": labs.catch,
      "snake-live": labs.snake,
      "aim-live": labs.aim,
      "lane-live": labs.lane,
      "break-live": labs.break,
    }),
  ).find((row) => row.id === id);
  return seatBookFace(id, {
    owned: ownedIds.includes(id),
    watchScore: sit?.score ?? null,
    watchNote: sit?.note ?? "",
    viewerIsSeat,
  });
}

export async function GET(request: Request) {
  try {
    const token = await getSessionToken();
    await readyFriends();
    await readySocial();
    const search = new URL(request.url).searchParams;
    const username = search.get("u") ?? "";
    const asked = Number(search.get("limit"));
    const limit = Number.isFinite(asked) && asked > 0 ? asked : AUTHOR_PAGE;
    const payload = await withStoreRead(async (store) => {
      const user = userFromToken(store, token);
      if (user) ensureInviteCode(store, user);
      if (!username && !user) {
        const error = new Error("Sign in to continue.");
        (error as Error & { status: number }).status = 401;
        throw error;
      }
      const look = username || user!.username;
      const profile = publicProfile(store, user, look);
      const author = Object.values(store.users).find(
        (item) => item.username.toLowerCase() === profile.username.toLowerCase(),
      );
      if (author) {
        profile.record = await playerRecord(author.id);
        const board = await listHouseBoard();
        profile.place = boardPlaceFor(board, author.username);
        profile.lastTakes = await listSeatTakes(store, author.id, 6);
        const notes = await listSeatNotes(store, user, author.id);
        profile.notes = notes.notes;
        profile.yourNote = notes.yourNote;
      }
      const you = user ? youPayload(user) : null;
      if (you && user) you.unreadMessages = await refreshUnread(user.id);
      const posts = author ? await listAuthorPosts(store, user, author.id, limit) : [];
      const projects = author ? await listSeatProjects(store, author.id, user?.id) : [];
      const books = author ? publicOwnedBooks(await ownedMarks(author.id)) : [];
      const ownedIds = author ? await ownedMarks(author.id) : [];
      const bookFace =
        author && !isHouseUser(author) ? await bookFaceFor(author.book ?? "", ownedIds, Boolean(user && user.id === author.id)) : null;
      const applications = author && !isHouseUser(author) ? await yourApplications(author.id) : [];
      const history = seatHistory({
        takes: profile.lastTakes ?? [],
        files: books,
        applications,
      });
      const bookId = bookFace?.id ?? "";
      const seat = author && !isHouseUser(author) ? author : null;
      const jobs = seatJobs({
        people: seat
          ? companyFaces(
              companyIds(seat.id),
              Object.values(store.users).map((item) => ({
                id: item.id,
                username: item.username,
                closed: Boolean(item.closedAt),
              })),
            )
          : [],
        circles: seat ? await circlesForSeat(seat.id) : [],
        book: bookFace ? { id: bookFace.id, name: bookFace.name, watch: bookFace.watch } : null,
        sameBook: othersOnBook(
          Object.values(store.users).map((item) => ({
            id: item.id,
            username: item.username,
            book: item.closedAt ? "" : sitParam(item.book),
          })),
          bookId,
          author?.id ?? "",
        ),
        lines: houseDayPlan().map((row) => ({ title: row.title, href: row.href })),
        files: history.files.map((row) => ({ title: row.title, href: row.href })),
        vault: Boolean(user && author && user.id === author.id),
      });
      return {
        you,
        profile,
        projects,
        books,
        bookFace,
        history,
        jobs,
        posts,
        recommended: author
          ? await listSeatRecommended(store, user, author, profile.alike)
          : [],
        total: author ? await countAuthorPosts(author.id) : 0,
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
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      username?: string;
      body?: string;
      mark?: string;
      noteId?: string;
      headline?: string;
      about?: string;
      location?: string;
      avatar?: string;
      cover?: string;
      sitSlug?: string;
      book?: string;
      seat?: string;
      doors?: { x?: string; telegram?: string; discord?: string };
    };
    await readyFriends();
    await readySocial();
    const payload = await withStore(async (store) => {
      const user = requireUser(store, token);
      if (body.action === "note") {
        const notes = await saveSeatNote(store, user, body.username ?? "", body.body ?? "", body.mark);
        const you = youPayload(user);
        you.unreadMessages = await refreshUnread(user.id);
        return { you, notes: notes.notes, yourNote: notes.yourNote };
      }
      if (body.action === "delete-note") {
        const notes = await deleteSeatNote(store, user, body.noteId ?? "");
        const you = youPayload(user);
        you.unreadMessages = await refreshUnread(user.id);
        return { you, notes: notes.notes, yourNote: notes.yourNote };
      }
      if (body.action === "message") {
        const thread = await sendMessage(store, user, body.username ?? "", body.body ?? "");
        const you = youPayload(user);
        you.unreadMessages = await refreshUnread(user.id);
        return { you, sent: true, with: thread.with };
      }
      const profile = saveProfile(store, user, body);
      profile.record = await playerRecord(user.id);
      const board = await listHouseBoard();
      profile.place = boardPlaceFor(board, user.username);
      profile.lastTakes = await listSeatTakes(store, user.id, 6);
      const notes = await listSeatNotes(store, user, user.id);
      profile.notes = notes.notes;
      profile.yourNote = notes.yourNote;
      const you = youPayload(user);
      you.unreadMessages = await refreshUnread(user.id);
      const projects = await listSeatProjects(store, user.id, user.id);
      const ownedIds = await ownedMarks(user.id);
      const bookFace = isHouseUser(user) ? null : await bookFaceFor(user.book ?? "", ownedIds, true);
      return { you, profile, projects, bookFace };
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
