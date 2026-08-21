"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
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
  onState,
  onHide,
}: {
  slug: string;
  feed: RoomEvent[];
  user: PublicUser | null;
  onState: (state: GameState) => void;
  onHide?: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [feed.length, feed.at(-1)?.id]);

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
      setText("");
      onState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="room-feed">
      <div className="room-feed-head">
        <IconBell />
        {onHide ? (
          <button aria-label="Hide news" className="pit-ico desk-only" onClick={onHide} type="button">
            <IconHideRight />
          </button>
        ) : null}
      </div>
      <div className="room-feed-list" ref={scroller}>
        {feed.map((item) =>
          item.kind === "chat" ? (
            <article className="news-chat" key={item.id}>
              <span className="news-ava">{(item.username ?? "p").slice(0, 1).toUpperCase()}</span>
              <div>
                <header>
                  <b>@{item.username ?? "player"}</b>
                  <time>{stamp(item.createdAt)}</time>
                </header>
                <p>{item.body}</p>
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
        {feed.length === 0 ? <p className="room-feed-empty">Quiet table.</p> : null}
      </div>
      {user?.emailVerified ? (
        <form className="room-chat" onSubmit={(event) => void send(event)}>
          <input
            maxLength={240}
            onChange={(event) => setText(event.target.value)}
            placeholder="Message…"
            value={text}
          />
          <button aria-label="Send" disabled={busy || !text.trim()} type="submit">
            <IconSend />
          </button>
        </form>
      ) : (
        <p className="room-chat-gate">
          {user ? (
            <Link href="/verify-email">Verify to chat.</Link>
          ) : (
            <Link href="/signin">Sign in to chat.</Link>
          )}
        </p>
      )}
      {error ? <p className="room-chat-error">{error}</p> : null}
    </aside>
  );
}
