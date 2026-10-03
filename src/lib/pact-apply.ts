import { formatCents } from "@/lib/money";
import { notify } from "@/lib/notifications";
import type { StoreData, User } from "@/lib/types";
import type { VaultBook } from "@/lib/vault-pact";

export function bookFromStore(store: StoreData, extra: User[] = []): VaultBook {
  const balances: Record<string, number> = {};
  const take = (id: string) => {
    const user = store.users[id];
    if (!user) return;
    balances[id] = user.balance;
  };
  for (const pact of store.pacts ?? []) {
    take(pact.fromId);
    take(pact.toId);
  }
  for (const user of extra) take(user.id);
  return { balances, pacts: store.pacts ?? [], moves: [] };
}

/** Write vault cents, the contract rows, and the activity lines. Play credit is untouched. */
export function applyPactBook(store: StoreData, book: VaultBook) {
  for (const [id, balance] of Object.entries(book.balances)) {
    const user = store.users[id];
    if (!user) continue;
    const next = Math.round(balance);
    if (user.balance !== next) user.balance = next;
  }
  store.pacts = book.pacts;
  for (const move of book.moves) {
    if (store.txs.some((tx) => tx.id === move.id)) continue;
    store.txs.unshift({
      id: move.id,
      playerId: move.userId,
      type: "contract",
      amount: move.cents,
      createdAt: move.at,
      note: move.reason,
    });
    if (!store.users[move.userId]) continue;
    notify(store, move.userId, {
      kind: "system",
      title: move.cents < 0 ? "Contract locked" : "Contract paid",
      body: `${formatCents(Math.abs(move.cents))} USDT. ${move.reason}`,
      href: "/contracts",
    });
  }
  store.txs = store.txs.slice(0, 400);
  book.moves = [];
}
