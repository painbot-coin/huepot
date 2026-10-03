import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionToken, requireUser } from "@/lib/auth";
import {
  acceptFriendRequest,
  ignoreFriendRequest,
  listNetwork,
  readyFriends,
  sendFriendRequest,
  blockPlayer,
  unblockPlayer,
  unfriend,
} from "@/lib/friends";
import { booksBySeat } from "@/lib/house-marks";
import { sitParam } from "@/lib/house-mark-list";
import { isHouseUser } from "@/lib/house";
import { jsonError } from "@/lib/http";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";
import { touchPresence } from "@/lib/presence";
import { readySocial, refreshUnread } from "@/lib/social";
import { withStore, withStoreRead } from "@/lib/store";
import type { NetworkTab, User } from "@/lib/types";

export const runtime = "nodejs";

function parseTab(value: string | null): NetworkTab {
  if (value === "friends" || value === "requests") return value;
  return "pit";
}

async function companyFind(lang: string, book: string) {
  const locale = parseLocale(lang) ?? "";
  const id = sitParam(book);
  const books = id ? await booksBySeat() : {};
  return { locale, book: id, books };
}

function rememberTongue(user: User, locale: string) {
  const picked = parseLocale(locale);
  if (!picked || isHouseUser(user) || user.locale === picked) return;
  user.locale = picked;
}

export async function GET(request: Request) {
  try {
    const token = await getSessionToken();
    await readyFriends();
    await readySocial();
    const url = new URL(request.url);
    const find = await companyFind(url.searchParams.get("lang") ?? "", url.searchParams.get("book") ?? "");
    const payload = await withStoreRead(async (store) => {
      const user = requireUser(store, token);
      const data = listNetwork(
        store,
        user,
        parseTab(url.searchParams.get("tab")),
        url.searchParams.get("q") ?? "",
        url.searchParams.get("u") ?? "",
        url.searchParams.get("seat") ?? "",
        find,
      );
      data.you.unreadMessages = await refreshUnread(user.id);
      return data;
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
      tab?: string;
      q?: string;
      u?: string;
      seat?: string;
      lang?: string;
      book?: string;
    };
    const action = body.action ?? "";
    await readyFriends();
    await readySocial();
      const find = await companyFind(body.lang ?? "", body.book ?? "");
      const jar = await cookies();
      const picked = parseLocale(jar.get(LOCALE_COOKIE)?.value) ?? "";
      const payload = await withStore(async (store) => {
      const user = requireUser(store, token);
      touchPresence(user.id);
      rememberTongue(user, picked);
      if (action === "ping") {
        const data = listNetwork(
          store,
          user,
          parseTab(body.tab ?? null),
          body.q ?? "",
          body.u ?? "",
          body.seat ?? "",
          find,
        );
        data.you.unreadMessages = await refreshUnread(user.id);
        return data;
      }
      const username = body.username ?? "";
      if (action === "request") await sendFriendRequest(store, user, username);
      else if (action === "accept") await acceptFriendRequest(store, user, username);
      else if (action === "ignore") await ignoreFriendRequest(store, user, username);
      else if (action === "unfriend") await unfriend(store, user, username);
      else if (action === "block") await blockPlayer(store, user, username);
      else if (action === "unblock") await unblockPlayer(store, user, username);
      else throw new Error("Unknown network action.");
      const data = listNetwork(
        store,
        user,
        parseTab(body.tab ?? null),
        body.q ?? "",
        body.u ?? "",
        body.seat ?? "",
        find,
      );
      data.you.unreadMessages = await refreshUnread(user.id);
      return data;
    });
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
