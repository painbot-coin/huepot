/**
 * Find one real seat. Craft, language, and the book they sit.
 * Company is mutual elsewhere. A letter is not this list.
 * The house is not a seat, and an empty match stays empty.
 */

import { seatOf } from "@/lib/house-seats";
import { sitParam } from "@/lib/house-mark-list";
import { parseLocale } from "@/lib/locale";

export type CompanySeat = {
  id: string;
  seat: string;
  locale: string;
  books: string[];
  house?: boolean;
};

export function findCompany(
  seats: CompanySeat[],
  query: { craft?: string; locale?: string; book?: string } = {},
) {
  const craft = seatOf(query.craft);
  const tongue = parseLocale(query.locale) ?? "";
  const book = sitParam(query.book);
  return seats.filter((row) => {
    if (row.house) return false;
    if (craft && seatOf(row.seat) !== craft) return false;
    if (tongue && (parseLocale(row.locale) ?? "") !== tongue) return false;
    if (book && !row.books.includes(book)) return false;
    return true;
  });
}
