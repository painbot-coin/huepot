/** NETWORK: after a take, a short Fog table — not another house room. */
export const AFTER_TAKE_NAME = "After the take";
export const AFTER_TAKE_MINUTES = 30;
const FOG_SECONDS = 12;

export function afterTakeDraft() {
  return {
    name: AFTER_TAKE_NAME,
    buttonCount: 4,
    clickPrice: 1,
    roundSeconds: 60,
    liveMinutes: AFTER_TAKE_MINUTES,
    fog: true,
    fogSeconds: FOG_SECONDS,
  };
}

export function isFreshTake(at: number, now = Date.now()) {
  return at > 0 && now - at <= AFTER_TAKE_MINUTES * 60 * 1000;
}

export function afterTakeNoticeTitle(username: string) {
  return `${AFTER_TAKE_NAME} · @${username} opened Fog`;
}

export function afterTakeNoticeBody() {
  return "Sit with them. 30 minutes.";
}

export function findOpenAfterTake(
  rooms: { slug: string; kind: string; ownerId?: string | null; name: string; closesAt?: number | null }[],
  ownerId: string,
  now = Date.now(),
) {
  return (
    rooms.find(
      (room) =>
        room.kind === "custom" &&
        room.ownerId === ownerId &&
        room.name === AFTER_TAKE_NAME &&
        (room.closesAt == null || room.closesAt > now),
    ) ?? null
  );
}
