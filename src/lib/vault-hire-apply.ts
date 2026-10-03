import { formatCents } from "@/lib/money";
import { notify } from "@/lib/notifications";
import type { StoreData, User } from "@/lib/types";
import type { HireBook } from "@/lib/vault-hire";

export function hireBook(store: StoreData, extra: User[] = []): HireBook {
  const balances: Record<string, number> = {};
  const take = (id: string) => {
    const user = store.users[id];
    if (!user) return;
    balances[id] = user.balance;
  };
  for (const hire of store.hires ?? []) {
    take(hire.buyerId);
    take(hire.providerId);
  }
  for (const pay of store.pays ?? []) take(pay.ownerId);
  for (const user of extra) take(user.id);
  return { balances, hires: store.hires ?? [], pays: store.pays ?? [], moves: [] };
}

export function applyHire(store: StoreData, book: HireBook) {
  for (const [id, balance] of Object.entries(book.balances)) {
    const user = store.users[id];
    if (!user) continue;
    const next = Math.round(balance);
    if (user.balance !== next) user.balance = next;
  }
  store.hires = book.hires;
  store.pays = book.pays;
  for (const move of book.moves) {
    if (store.txs.some((tx) => tx.id === move.id)) continue;
    store.txs.unshift({
      id: move.id,
      playerId: move.userId,
      type: "hire",
      amount: move.cents,
      createdAt: move.at,
      note: move.reason,
    });
    if (!store.users[move.userId]) continue;
    notify(store, move.userId, {
      kind: "system",
      title: move.cents < 0 ? "Hire held" : "Hire paid",
      body: `${formatCents(Math.abs(move.cents))} USDT. ${move.reason}`,
      href: "/atrium/work",
    });
  }
  store.txs = store.txs.slice(0, 400);
  book.moves = [];
}
