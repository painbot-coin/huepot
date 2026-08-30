"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NetworkChrome, SignInGate, initials } from "@/components/NetworkChrome";
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
    setPeer(withUser);
    void load(withUser)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load"))
      .finally(() => setBooted(true));
    const id = window.setInterval(() => void load(withUser || peer).catch(() => undefined), 8_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withUser]);

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
        you?: NetworkYou;
        inbox?: NetworkThread[];
        messages?: NetworkMessage[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not send");
      setDraft("");
      setYou(data.you ?? null);
      setInbox(data.inbox ?? []);
      setMessages(data.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    }
  }

  if (!booted) {
    return (
      <NetworkChrome>
        <p className="px-4 py-16 text-center text-zinc-400">Opening messages…</p>
      </NetworkChrome>
    );
  }
  if (needSignIn) return <SignInGate />;

  return (
    <NetworkChrome you={you}>
      <main className="li-main is-wide">
        <aside className="li-card li-inbox">
          <p className="lobby-label">Messaging</p>
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
                    <span className="li-avatar is-sm">{initials(thread.username)}</span>
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
                <Link href={`/network/u/${encodeURIComponent(peer)}`}>@{peer}</Link>
              </p>
              <ul className="li-bubbles">
                {messages.map((item) => (
                  <li className={item.fromYou ? "is-you" : ""} key={item.id}>
                    {item.body}
                  </li>
                ))}
              </ul>
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
                <button className="chip-btn" type="submit">
                  Send
                </button>
              </form>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Pick a conversation or open a profile and hit Message.</p>
          )}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </section>
      </main>
    </NetworkChrome>
  );
}
