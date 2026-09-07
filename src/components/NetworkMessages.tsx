"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, NetworkChrome, SignInGate } from "@/components/NetworkChrome";
import { useChatScroll } from "@/components/useChatScroll";
import type { NetworkMessage, NetworkThread, NetworkYou } from "@/lib/types";

export function NetworkMessages() {
  const params = useSearchParams();
  const withUser = params.get("with") ?? "";
  const [you, setYou] = useState<NetworkYou | null>(null);
  const [inbox, setInbox] = useState<NetworkThread[]>([]);
  const [peer, setPeer] = useState(withUser);
  const [messages, setMessages] = useState<NetworkMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [needSignIn, setNeedSignIn] = useState(false);
  const [booted, setBooted] = useState(false);
  const [busy, setBusy] = useState(false);
  const { scroller, onScroll, pinBottom } = useChatScroll<HTMLUListElement>(
    `${peer}:${messages.at(-1)?.id ?? ""}:${messages.length}`,
  );

  async function load(name = peer) {
    const search = name ? `?with=${encodeURIComponent(name)}` : "";
    const response = await fetch(`/api/network/messages${search}`);
    if (response.status === 401) {
      setNeedSignIn(true);
      return;
    }
    const data = (await response.json()) as {
      you?: NetworkYou;
      inbox?: NetworkThread[];
      with?: string;
      messages?: NetworkMessage[];
      error?: string;
    };
    if (!response.ok) throw new Error(data.error || "Could not load messages");
    setNeedSignIn(false);
    setYou(data.you ?? null);
    setInbox(data.inbox ?? []);
    if (data.with) setPeer(data.with);
    setMessages(data.messages ?? []);
  }

  useEffect(() => {
    pinBottom();
    setPeer(withUser);
    void load(withUser)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load"))
      .finally(() => setBooted(true));
    const id = window.setInterval(() => void load(withUser || peer).catch(() => undefined), 8_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withUser]);

  async function send() {
    if (!peer || !draft.trim() || busy) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/network/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: peer, body: draft }),
      });
      const data = (await response.json()) as {
        you?: NetworkYou;
        inbox?: NetworkThread[];
        messages?: NetworkMessage[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not send");
      pinBottom();
      setDraft("");
      setYou(data.you ?? null);
      setInbox(data.inbox ?? []);
      setMessages(data.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  if (!booted) {
    return (
      <NetworkChrome>
        <main className="li-main is-wide">
          <aside className="li-card li-inbox">
            <p className="lobby-label">Letters</p>
            <p className="mt-3 text-sm text-zinc-500">Opening lettersâ€¦</p>
          </aside>
          <section className="li-card li-chat">
            <p className="text-sm text-zinc-500">Opening this chatâ€¦</p>
          </section>
        </main>
      </NetworkChrome>
    );
  }
  if (needSignIn) return <SignInGate />;

  return (
    <NetworkChrome you={you}>
      <main className={`li-main is-wide ${peer ? "is-thread" : ""}`}>
        <aside className="li-card li-inbox">
          <p className="lobby-label">Letters</p>
          {inbox.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No threads yet.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {inbox.map((thread) => (
                <li key={thread.username}>
                  <Link
                    className={`li-thread ${peer === thread.username ? "is-on" : ""}`}
                    href={`/network/messages?with=${encodeURIComponent(thread.username)}`}
                    onClick={() => setPeer(thread.username)}
                  >
                    <Avatar avatar={thread.avatar} size="sm" username={thread.username} />
                    <span>
                      <strong>@{thread.username}</strong>
                      <em>{thread.lastBody}</em>
                    </span>
                    {thread.unread ? <b>{thread.unread}</b> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section className="li-card li-chat">
          {peer ? (
            <>
              <p className="li-chat-top">
                <Link className="li-back" href="/network/messages" onClick={() => setPeer("")}>
                  Inbox
                </Link>
                <Link href={`/network/u/${encodeURIComponent(peer)}`}>@{peer}</Link>
              </p>
              <ul className="li-bubbles" onScroll={onScroll} ref={scroller}>
                {messages.length === 0 ? (
                  <li className="text-sm text-zinc-500">Say hello to @{peer}.</li>
                ) : (
                  messages.map((item) => (
                    <li className={item.fromYou ? "is-you" : ""} key={item.id}>
                      {item.body}
                    </li>
                  ))
                )}
              </ul>
              {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
              <form
                className="li-compose"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
              >
                <input
                  className="field"
                  maxLength={500}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`Message @${peer}`}
                  value={draft}
                />
                <button className="chip-btn" disabled={busy || !draft.trim()} type="submit">
                  {busy ? "Sendingâ€¦" : "Send"}
                </button>
              </form>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Pick a conversation or open a profile and hit Message.</p>
          )}
          {error && !peer ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </section>
      </main>
    </NetworkChrome>
  );
}
