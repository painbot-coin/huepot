"use client";

import ChatBubbleOutlinedIcon from "@mui/icons-material/ChatBubbleOutlined";
import IconButton from "@mui/material/IconButton";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { HouseButton, HouseField, HouseLink } from "@/components/HouseUi";
import { useChatScroll } from "@/components/useChatScroll";
import { MESSAGE_OPEN, openMessageDock } from "@/lib/message-dock";
import { COMPANY_CLASSIC_HREF, sitClassicLabel } from "@/lib/company-door";
import type { NetworkMessage, NetworkThread } from "@/lib/types";

function onPit(path: string) {
  return path.startsWith("/rooms/");
}

function whenLabel(at: number) {
  const mins = Math.floor(Math.max(0, Date.now() - at) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function MessageLaunch() {
  const path = usePathname();
  if (onPit(path)) {
    return (
      <IconButton
        aria-label="Chat"
        className="notice-bell"
        component={HouseLink}
        href="/network/messages"
      >
        <ChatBubbleOutlinedIcon fontSize="small" />
      </IconButton>
    );
  }
  return (
    <IconButton
      aria-label="Chat"
      className="notice-bell"
      onClick={() => openMessageDock()}
    >
      <ChatBubbleOutlinedIcon fontSize="small" />
    </IconButton>
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
    <HouseButton
      className={className}
      ghost
      onClick={() => openMessageDock(username)}
    >
      Message
    </HouseButton>
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
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState<Record<string, boolean>>({});
  const { scroller, onScroll, pinBottom } = useChatScroll<HTMLUListElement>(
    `${peer}:${messages.at(-1)?.id ?? ""}:${messages.length}`,
  );

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
    pinBottom();
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

  async function report(id: string) {
    if (!id || reported[id] || busy) return;
    if (!window.confirm("Report this to the house?")) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/network/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "report", messageId: id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not report");
      setReported((current) => ({ ...current, [id]: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not report");
    } finally {
      setBusy(false);
    }
  }

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
        inbox?: NetworkThread[];
        messages?: NetworkMessage[];
        error?: string;
        you?: { unreadMessages?: number };
      };
      if (!response.ok) throw new Error(data.error || "Could not send");
      pinBottom();
      setDraft("");
      setInbox(data.inbox ?? []);
      setMessages(data.messages ?? []);
      setUnread(data.you?.unreadMessages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  const filtered = query.trim()
    ? inbox.filter((thread) => thread.username.toLowerCase().includes(query.trim().toLowerCase()))
    : inbox;
  if (path.startsWith("/network/messages") || onPit(path)) return null;

  return (
    <div className="msg-dock">
      {open && chatOpen && peer ? (
        <section className="msg-panel msg-chat is-fade-in">
          <header className="msg-bar">
            <Link href={`/network/u/${encodeURIComponent(peer)}`}>@{peer}</Link>
            <span>
              <Link href={COMPANY_CLASSIC_HREF}>{sitClassicLabel()}</Link>
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
            </span>
          </header>
          <ul className="msg-bubbles" onScroll={onScroll} ref={scroller}>
            {messages.length === 0 ? (
              <li className="msg-empty">Say hello to @{peer}.</li>
            ) : (
              messages.map((item) => (
                <li className={item.fromYou ? "is-you" : ""} key={item.id}>
                  <span>{item.body}</span>
                  {!item.fromYou ? (
                    <button
                      className="nav-link bubble-report"
                      disabled={busy || reported[item.id]}
                      onClick={() => void report(item.id)}
                      type="button"
                    >
                      {reported[item.id] ? "Reported" : "Report"}
                    </button>
                  ) : null}
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
            <HouseField
              inputProps={{ maxLength: 500 }}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Message @${peer}`}
              value={draft}
            />
            <HouseButton disabled={busy || !draft.trim()} type="submit">
              {busy ? "Sending…" : "Send"}
            </HouseButton>
          </form>
          {error ? <p className="msg-error">{error}</p> : null}
        </section>
      ) : null}

      {!open ? (
        <button className="msg-tab is-fade-in" onClick={() => setOpen(true)} type="button">
          Messages
          {unread ? <b>{unread}</b> : null}
        </button>
      ) : !(chatOpen && peer) ? (
        <section className="msg-panel msg-inbox is-fade-in">
          <header className="msg-bar">
            <strong>Messages</strong>
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
                      <Avatar size="sm" username={name} />
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
                      <Avatar avatar={thread.avatar} size="sm" username={thread.username} />
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
            Open letters
          </Link>
        </section>
      ) : null}
    </div>
  );
}
