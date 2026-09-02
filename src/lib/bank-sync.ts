export const BANK_EVENT = "huepot:bank";

export function publishBank(balance: number) {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(balance)) return;
  window.dispatchEvent(new CustomEvent(BANK_EVENT, { detail: { balance } }));
}

export function onBank(handler: (balance: number) => void) {
  function listen(event: Event) {
    const balance = (event as CustomEvent<{ balance?: number }>).detail?.balance;
    if (typeof balance === "number" && Number.isFinite(balance)) handler(balance);
  }
  window.addEventListener(BANK_EVENT, listen);
  return () => window.removeEventListener(BANK_EVENT, listen);
}
