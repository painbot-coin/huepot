"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { useChatScroll } from "@/components/useChatScroll";
import {
  IconBell,
  IconBolt,
  IconCash,
  IconChat,
  IconHideRight,
  IconJoin,
  IconSend,
  IconUndo,
} from "@/components/Icons";
import type { GameState, PublicUser, RoomEvent } from "@/lib/types";
import { isQuietRoundLine } from "@/lib/rooms";

const KIND_ICON: Record<RoomEvent["kind"], ReactNode> = {
  chat: <IconChat />,
  system: <IconBell />,
  payout: <IconCash />,
  refund: <IconUndo />,
  round: <IconBolt />,
  join: <IconJoin />,
};

const KIND_LABEL: Record<RoomEvent["kind"], string> = {
  chat: "Chat",
  system: "Table",
  payout: "Payout",
  refund: "Refund",
  round: "Round",
  join: "Join",
};

function stamp(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function RoomFeed({
  slug,
  feed,
  user,
  muted,
  onState,
  onHide,
}: {
  slug: string;
  feed: RoomEvent[];
  user: PublicUser | null;
  muted?: boolean;
  onState: (state: GameState) => void;
  onHide?: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState<Record<string, boolean>>({});
  const { scroller, onScroll, pinBottom } = useChatScroll<HTMLDivElement>(
    `${slug}:${feed.at(-1)?.id ?? ""}:${feed.length}`,
  );

  async function report(eventId: string) {
    setError("");
    try {
      const response = await fetch(`/api/rooms/${slug}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not report");
      setReported((current) => ({ ...current, [eventId]: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not report");
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await response.json()) as GameState & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not send");
      pinBottom();
      setText("");
      onState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  const visible = feed.filter(
    (item) => item.kind !== "round" || !isQuietRoundLine(item.body),
  );

  return (
    <aside className="room-feed">
      <div className="room-feed-head">
        <span className="room-feed-title">
          <IconBell />
          Talk
        </span>
        {onHide ? (
          <button aria-label="Hide talk" className="pit-ico desk-only" onClick={onHide} type="button">
            <IconHideRight />
          </button>
        ) : null}
      </div>
      <div className="room-feed-list" onScroll={onScroll} ref={scroller}>
        {visible.map((item) =>
          item.kind === "chat" ? (
            <article className="news-chat" key={item.id}>
              <span className="news-ava">{(item.username ?? "p").slice(0, 1).toUpperCase()}</span>
              <div>
                <header>
                  <b>@{item.username ?? "player"}</b>
                  <time>{stamp(item.createdAt)}</time>
                </header>
                <p>{item.body}</p>
                {user && item.userId && item.userId !== user.id && item.body !== "Removed." ? (
                  <button
                    className="mt-1 text-[10px] uppercase tracking-widest text-zinc-600"
                    disabled={Boolean(reported[item.id])}
                    onClick={() => void report(item.id)}
                    type="button"
                  >
                    {reported[item.id] ? "Reported" : "Report"}
                  </button>
                ) : null}
              </div>
            </article>
          ) : (
            <article className={`news-row is-${item.kind}`} key={item.id}>
              <span className="news-ico" title={KIND_LABEL[item.kind]}>
                {KIND_ICON[item.kind]}
              </span>
              <div>
                <p>{item.body}</p>
                <time>{stamp(item.createdAt)}</time>
              </div>
            </article>
          ),
        )}
        {visible.length === 0 ? <p className="room-feed-empty">Takes and talk land here.</p> : null}
      </div>
      {user?.emailVerified && !muted ? (
        <form className="room-chat" onSubmit={(event) => void send(event)}>
          <input
            maxLength={240}
            onChange={(event) => setText(event.target.value)}
            placeholder="Speak at the table…"
            value={text}
          />
          <button aria-label="Send" disabled={busy || !text.trim()} type="submit">
            <IconSend />
          </button>
        </form>
      ) : (
        <form className="room-chat is-gated" onSubmit={(event) => event.preventDefault()}>
          <input disabled placeholder={muted ? "The host muted you." : "Sign in to chat…"} />
          {muted ? (
            <button aria-label="Send" disabled type="button">
              <IconSend />
            </button>
          ) : (
            <Link aria-label="Sign in to chat" className="room-chat-go" href="/signin">
              <IconSend />
            </Link>
          )}
        </form>
      )}
      {error ? <p className="room-chat-error">{error}</p> : null}
    </aside>
  );
}
