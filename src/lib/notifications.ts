import type { Notice, NoticeKind, StoreData } from "./types";

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
  store.notifications = store.notifications.slice(0, 500);
  return notice;
}

export function userNotices(store: StoreData, userId: string) {
  return store.notifications.filter((item) => item.userId === userId);
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
