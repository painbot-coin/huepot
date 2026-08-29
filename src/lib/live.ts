type RoomListener = (payload: { slug: string; closed?: boolean }) => void;

const listeners = new Map<string, Set<RoomListener>>();
let ticker: ReturnType<typeof setInterval> | null = null;
let ticking = false;

export function subscribeRoom(slug: string, listener: RoomListener) {
  let set = listeners.get(slug);
  if (!set) {
    set = new Set();
    listeners.set(slug, set);
  }
  set.add(listener);
  ensureTicker();
  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(slug);
  };
}

export function publishRoom(slug: string, closed = false) {
  for (const listener of listeners.get(slug) ?? []) {
    listener({ slug, closed });
  }
}

export function liveRoomSlugs() {
  return [...listeners.keys()];
}

function ensureTicker() {
  if (ticker) return;
  ticker = setInterval(() => {
    void tickLiveRooms();
  }, 1000);
}

async function tickLiveRooms() {
  if (ticking) return;
  const slugs = liveRoomSlugs();
  if (slugs.length === 0) return;
  ticking = true;
  try {
    const { withStore, withStoreRead } = await import("@/lib/store");
    const { getRoomState, roomDueForTick } = await import("@/lib/game");
    const due = await withStoreRead((store) =>
      slugs.filter((slug) => roomDueForTick(store.rooms[slug])),
    );
    if (due.length === 0) return;
    await withStore((store) => {
      for (const slug of due) {
        if (!store.rooms[slug]) {
          publishRoom(slug, true);
          continue;
        }
        try {
          getRoomState(store, slug, null);
        } catch {
          publishRoom(slug, true);
        }
      }
    });
  } catch {
    /* keep the stream alive */
  } finally {
    ticking = false;
  }
}
