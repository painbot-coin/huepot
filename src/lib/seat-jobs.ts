/**
 * One seat, three doors.
 * Social opens company and a room the seat is in.
 * AI opens the book and the watch. The house speaks as the house.
 * Web3 opens an owned file. Balance stays on the vault.
 * A book does not speak as the seat and it holds no wallet.
 */

export function companyFaces(
  ids: string[],
  users: { id: string; username: string; closed?: boolean }[],
) {
  const byId = new Map(users.map((user) => [user.id, user]));
  const seen = new Set<string>();
  const out: { username: string; href: string }[] = [];
  for (const id of ids) {
    const user = byId.get(id);
    if (!user || user.closed || !user.username) continue;
    if (user.id === "house" || user.username.toLowerCase() === "house") continue;
    const key = user.username.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ username: user.username, href: `/network/u/${encodeURIComponent(user.username)}` });
  }
  return out;
}

export function othersOnBook(
  seats: { id: string; username: string; book: string }[],
  bookId: string,
  seatId: string,
) {
  const id = bookId.trim();
  if (!id) return [];
  const seen = new Set<string>();
  const out: { username: string; href: string }[] = [];
  for (const seat of seats) {
    if (!seat.username || seat.id === seatId || seat.id === "house") continue;
    if (seat.username.toLowerCase() === "house") continue;
    if (seat.book !== id) continue;
    const key = seat.username.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ username: seat.username, href: `/network/u/${encodeURIComponent(seat.username)}` });
  }
  return out;
}

export function seatJobs(input: {
  people: { username: string; href: string }[];
  circles: { id: string; label: string }[];
  book: { id: string; name: string; watch: string } | null;
  sameBook: { username: string; href: string }[];
  lines: { title: string; href: string }[];
  files: { title: string; href: string }[];
  vault: boolean;
}) {
  const people = input.people.filter((row) => row.username && row.href);
  const circles = input.circles.map((row) => ({
    id: row.id,
    label: row.label,
    href: `/rooms/c/${row.id}`,
  }));
  const book = input.book;
  const files = input.files.filter((row) => row.title && row.href);
  const lines = input.lines.filter((row) => row.title && row.href).slice(0, 3);
  const voice = {
    lines,
    speaksAsSeat: false as const,
    holdsWallet: false as const,
  };
  return {
    social: { people, circles },
    ai: book
      ? {
          bookId: book.id,
          bookName: book.name,
          watch: book.watch,
          sitHref: `/wait?sit=${encodeURIComponent(book.id)}`,
          pairHref: `/wait?pair=${encodeURIComponent(book.id)}`,
          ...voice,
          sameBook: input.sameBook,
        }
      : {
          bookId: "",
          bookName: "",
          watch: "",
          sitHref: "/wait",
          pairHref: "",
          ...voice,
          sameBook: [],
        },
    web3: {
      files,
      vaultHref: input.vault ? "/account" : "",
      secondNumber: false as const,
      charge: "USDT plays, buys a priced file, or locks a contract.",
    },
  };
}
