import { headlineOf, seatedAt } from "@/lib/friends";
import { HOUSE_USER_ID, isHouseUser } from "@/lib/house";
import { alikeWhy, parseSearchIntent, seatMatchesQuery, tasteOf } from "@/lib/seat-alike";
import type { SearchHit, StoreData, User } from "@/lib/types";

export { searchRooms } from "@/lib/seat-alike";

export function searchSeats(store: StoreData, query: string, viewer: User): SearchHit["users"] {
  const intent = parseSearchIntent(query);
  if (intent.text.length < 1) return [];
  const yourTaste = tasteOf(viewer, { sitting: seatedAt(store, viewer.id)?.slug ?? "" });

  return Object.values(store.users)
    .filter((user) => user.id !== HOUSE_USER_ID && !isHouseUser(user) && user.id !== viewer.id)
    .map((user) => {
      const room = seatedAt(store, user.id);
      const theirs = tasteOf(user, { sitting: room?.slug ?? "" });
      const nameHit = user.username.toLowerCase().includes(intent.text);
      if (!seatMatchesQuery(user, intent, theirs) && !nameHit) return null;
      const why =
        alikeWhy(yourTaste, theirs) ||
        (intent.slug && theirs.slugs.includes(intent.slug) ? `Sits ${intent.slug}` : "") ||
        (intent.color && theirs.hue.toLowerCase() === intent.color.toLowerCase()
          ? `Favours ${intent.color}`
          : nameHit
            ? "Name match"
            : "");
      return {
        username: user.username,
        avatar: (user.avatar ?? "").trim(),
        headline: headlineOf(user),
        why,
        rooms: room ? [{ slug: room.slug, name: room.name }] : [],
        score: (why && why !== "Name match" ? 2 : 0) + (nameHit ? 3 : 1),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
    .slice(0, 12)
    .map(({ score: _score, ...row }) => row);
}
