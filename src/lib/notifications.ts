import type { Notice, NoticeKind, StoreData } from "./types";

/**
 * How many notices the store carries. An inbox shows 40, and the store is
 * deep-cloned on every write, so older ones are cost without a reader.
 * Rows past this stay in the database.
 */
export const NOTICE_CAP = 500;

export function notify(
  store: StoreData,
  userId: string,
  input: { kind: NoticeKind; title: string; body: string; href?: string },
) {
  const notice: Notice = {
    id: crypto.randomUUID(),
    userId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    href: input.href ?? "/",
    read: false,
    createdAt: Date.now(),
  };
  store.notifications.unshift(notice);
  store.notifications = store.notifications.slice(0, NOTICE_CAP);
  return notice;
}

export function userNotices(store: StoreData, userId: string) {
  // Callers take the first several as "the latest", so the order is sorted
  // here rather than left to how the list happened to be built.
  return store.notifications
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function unreadCount(store: StoreData, userId: string) {
  return userNotices(store, userId).filter((item) => !item.read).length;
}

export function markNoticeRead(store: StoreData, userId: string, id?: string) {
  for (const item of store.notifications) {
    if (item.userId !== userId) continue;
    if (!id || item.id === id) item.read = true;
  }
}
