import type { StoreData } from "@/lib/types";

export function markBuyNote(id: string) {
  return `Wait mark · ${id}`;
}

export function projectBuyNote(id: string) {
  return `Seat project · ${id}`;
}

export function paidNoteInStore(store: Pick<StoreData, "txs">, userId: string, note: string) {
  return store.txs.some((tx) => tx.playerId === userId && tx.type === "mark" && tx.note === note);
}

export function paidMarkInStore(store: Pick<StoreData, "txs">, userId: string, markId: string) {
  return paidNoteInStore(store, userId, markBuyNote(markId));
}

export function paidProjectInStore(store: Pick<StoreData, "txs">, userId: string, projectId: string) {
  return paidNoteInStore(store, userId, projectBuyNote(projectId));
}
