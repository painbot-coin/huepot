/**
 * Seven doors. Each one is already a room in the house.
 * Two books share a sit. Neither holds a wallet.
 * The record is the history. There is no second lifetime number.
 * A project is not a wage. A priced file is the only USDT charge.
 */

export type HouseStep = {
  id: string;
  title: string;
  line: string;
  href: string;
};

export function houseLadder(input?: { bookId?: string; fileHref?: string; profileHref?: string }): HouseStep[] {
  const book = (input?.bookId ?? "").trim();
  const profile = (input?.profileHref ?? "").trim() || "/network";
  const file = (input?.fileHref ?? "").trim() || "/wait/store";
  const sit = book ? `/wait?sit=${encodeURIComponent(book)}` : "/wait";
  const pair = book ? `/wait?pair=${encodeURIComponent(book)}` : "/wait";
  return [
    {
      id: "seat",
      title: "A seat",
      line: "Company, a room, and the book on one profile.",
      href: profile,
    },
    {
      id: "book",
      title: "A book",
      line: "It sits. It does not speak as the seat.",
      href: sit,
    },
    {
      id: "store",
      title: "The store",
      line: "A free file downloads. A priced file needs gold.",
      href: "/wait/store",
    },
    {
      id: "pair",
      title: "Two books",
      line: "One sit. Neither holds a wallet.",
      href: pair,
    },
    {
      id: "file",
      title: "The file",
      line: "The seat owns it. Gold is not a split.",
      href: file,
    },
    {
      id: "record",
      title: "The record",
      line: "Takes, files, and finished work. There is no second number.",
      href: profile.includes("#") ? profile : `${profile}#history`,
    },
    {
      id: "project",
      title: "A project",
      line: "Share it on the desk. USDT is not a wage.",
      href: "/jobs",
    },
  ];
}
