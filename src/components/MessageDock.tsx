"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { initials } from "@/components/NetworkChrome";
import { MESSAGE_OPEN, openMessageDock } from "@/lib/message-dock";
import type { NetworkMessage, NetworkThread } from "@/lib/types";

function whenLabel(at: number) {
  const mins = Math.floor(Math.max(0, Date.now() - at) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function MessageLaunch() {
  return (
    <button
      aria-label="Messaging"
      className="notice-bell"
      onClick={() => openMessageDock()}
      type="button"
    >
      Messaging
    </button>
  );
}

export function MessageLink({
  username,
  className,
}: {
  username: string;
  className?: string;
}) {
  return (
    <button
      className={className ?? "chip-btn chip-btn-ghost"}
      onClick={() => openMessageDock(username)}
      type="button"
    >
      Message
    </button>
  );
}

export function MessageDock() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [peer, setPeer] = useState("");
  const [inbox, setInbox] = useState<NetworkThread[]>([]);
  const [messages, setMessages] = useState<NetworkMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [compose, setCompose] = useState(false);
  const [hits, setHits] = useState<string[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");

  async function loadInbox() {
    const response = await fetch("/api/network/messages");
    if (!response.ok) return;
    const data = (await response.json()) as {
      inbox?: NetworkThread[];
      you?: { unreadMessages?: number };
    };
    setInbox(data.inbox ?? []);
    setUnread(data.you?.unreadMessages ?? 0);
  }

  async function loadThread(name: string) {
    if (!name) {
      setMessages([]);
      return;
    }
    const response = await fetch(`/api/network/messages?with=${encodeURIComponent(name)}`);
    if (!response.ok) return;
    const data = (await response.json()) as {
      inbox?: NetworkThread[];
      messages?: NetworkMessage[];
      with?: string;
      you?: { unreadMessages?: number };
      error?: string;
    };
    setInbox(data.inbox ?? []);
    setMessages(data.messages ?? []);
    setUnread(data.you?.unreadMessages ?? 0);
    if (data.with) setPeer(data.with);
  }

  function openChat(name: string) {
    const who = name.trim();
    if (!who) return;
    setPeer(who);
    setChatOpen(true);
    setOpen(true);
    setCompose(false);
    setQuery("");
    void loadThread(who);
  }

  useEffect(() => {
    void loadInbox();
    const id = window.setInterval(() => {
      void loadInbox();
      if (chatOpen && peer) void loadThread(peer);
    }, 8_000);
    return () => window.clearInterval(id);
  }, [chatOpen, peer]);

  useEffect(() => {
    function onOpen(event: Event) {
      const name = (event as CustomEvent<{ username?: string }>).detail?.username ?? "";
      setOpen(true);
      if (name) openChat(name);
    }
    window.addEventListener(MESSAGE_OPEN, onOpen);
    return () => window.removeEventListener(MESSAGE_OPEN, onOpen);
  }, []);

  useEffect(() => {
    if (!compose || query.trim().length < 2) {
      setHits([]);
      return;
    }
    const id = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((response) => response.json())
        .then((data: { users?: { username: string }[] }) => {
          setHits((data.users ?? []).map((user) => user.username).slice(0, 6));
        })
        .catch(() => undefined);
    }, 160);
    return () => window.clearTimeout(id);
  }, [compose, query]);

  async function send() {
    if (!peer || !draft.trim()) return;
    setError("");
    try {
      const response = await fetch("/api/network/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: peer, body: draft }),
      });
      const data = (await response.json()) as {
        inbox?: NetworkThread[];
        messages?: NetworkMessage[];
        error?: string;
        you?: { unreadMessages?: number };
      };
      if (!response.ok) throw new Error(data.error || "Could not send");
      setDraft("");
      setInbox(data.inbox ?? []);
      setMessages(data.messages ?? []);
      setUnread(data.you?.unreadMessages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    }
  }

  const filtered = query.trim()
    ? inbox.filter((thread) => thread.username.toLowerCase().includes(query.trim().toLowerCase()))
    : inbox;
  if (path.startsWith("/network/messages")) return null;

  return (
    <div className="msg-dock">
      {open && chatOpen && peer ? (
        <section className="msg-panel msg-chat is-fade-in">
          <header className="msg-bar">
            <Link href={`/network/u/${encodeURIComponent(peer)}`}>@{peer}</Link>
            <button
              aria-label="Close chat"
              onClick={() => {
                setChatOpen(false);
                setPeer("");
              }}
              type="button"
            >
              ×
            </button>
          </header>
          <ul className="msg-bubbles">
            {messages.length === 0 ? (
              <li className="msg-empty">Say hello to @{peer}.</li>
            ) : (
              messages.map((item) => (
                <li className={item.fromYou ? "is-you" : ""} key={item.id}>
                  {item.body}
                </li>
              ))
            )}
          </ul>
          <form
            className="msg-compose"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <input
              maxLength={500}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Message @${peer}`}
              value={draft}
            />
            <button type="submit">Send</button>
          </form>
          {error ? <p className="msg-error">{error}</p> : null}
        </section>
      ) : null}

      {!open ? (
        <button className="msg-tab is-fade-in" onClick={() => setOpen(true)} type="button">
          Messaging
          {unread ? <b>{unread}</b> : null}
        </button>
      ) : !(chatOpen && peer) ? (
        <section className="msg-panel msg-inbox is-fade-in">
          <header className="msg-bar">
            <strong>Messaging</strong>
            <span>
              <button
                aria-label="New message"
                onClick={() => {
                  setCompose((value) => !value);
                  setQuery("");
                }}
                type="button"
              >
                +
              </button>
              <button aria-label="Minimize messaging" onClick={() => setOpen(false)} type="button">
                –
              </button>
            </span>
          </header>
          <input
            className="msg-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={compose ? "Find someone to message" : "Search messages"}
            value={query}
          />
          {compose ? (
            <ul className="msg-list">
              {hits.length === 0 ? (
                <li className="msg-empty">Type a username to start a chat.</li>
              ) : (
                hits.map((name) => (
                  <li key={name}>
                    <button onClick={() => openChat(name)} type="button">
                      <span className="li-avatar is-sm">{initials(name)}</span>
                      <span>@{name}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <ul className="msg-list">
              {filtered.length === 0 ? (
                <li className="msg-empty">No conversations yet.</li>
              ) : (
                filtered.map((thread) => (
                  <li key={thread.username}>
                    <button
                      className={peer === thread.username ? "is-on" : ""}
                      onClick={() => openChat(thread.username)}
                      type="button"
                    >
                      <span className="li-avatar is-sm">{initials(thread.username)}</span>
                      <span>
                        <strong>@{thread.username}</strong>
                        <em>{thread.lastBody}</em>
                      </span>
                      <i>
                        {whenLabel(thread.lastAt)}
                        {thread.unread ? <b>{thread.unread}</b> : null}
                      </i>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
          <Link className="msg-all" href="/network/messages">
            Open messaging
          </Link>
        </section>
      ) : null}
    </div>
  );
}
