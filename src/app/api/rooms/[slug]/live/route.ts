import { getSessionToken, userFromToken } from "@/lib/auth";
import { getRoomState, snapshotRoomState } from "@/lib/game";
import { subscribeRoom } from "@/lib/live";
import { withStore, withStoreRead } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const token = await getSessionToken();
  const encoder = new TextEncoder();
  let unsubscribe: () => void = () => undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = async (opts: { closed?: boolean; tick?: boolean } = {}) => {
        try {
          if (opts.closed) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ closed: true })}\n\n`));
            return;
          }
          const state = opts.tick
            ? await withStore((store) => {
                const user = userFromToken(store, token);
                return getRoomState(store, slug, user?.id ?? null);
              })
            : await withStoreRead((store) => {
                const user = userFromToken(store, token);
                return snapshotRoomState(store, slug, user?.id ?? null);
              });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`));
        } catch {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ closed: true })}\n\n`));
          } catch {
            /* stream already closed */
          }
        }
      };

      unsubscribe = subscribeRoom(slug, ({ closed }) => {
        void send({ closed });
      });
      void send({ tick: true });
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(ping);
        }
      }, 15_000);
      const stop = () => {
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      request.signal.addEventListener("abort", stop);
    },
    cancel() {
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
