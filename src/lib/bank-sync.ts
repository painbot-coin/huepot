export const BANK_EVENT = "huepot:bank";

export function publishBank(balance: number, bonus?: number) {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(balance)) return;
  window.dispatchEvent(
    new CustomEvent(BANK_EVENT, {
      detail: {
        balance,
        bonus: typeof bonus === "number" && Number.isFinite(bonus) ? bonus : undefined,
      },
    }),
  );
}

export function onBank(handler: (balance: number, bonus?: number) => void) {
  function listen(event: Event) {
    const detail = (event as CustomEvent<{ balance?: number; bonus?: number }>).detail;
    const balance = detail?.balance;
    if (typeof balance === "number" && Number.isFinite(balance)) {
      handler(balance, detail?.bonus);
    }
  }
  window.addEventListener(BANK_EVENT, listen);
  return () => window.removeEventListener(BANK_EVENT, listen);
}
