"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar, NetworkChrome, SignInGate } from "@/components/NetworkChrome";
import type { FriendRelation, NetworkCard, NetworkPost, NetworkYou } from "@/lib/types";

type FeedTab = "recent" | "recommended";

function whenLabel(at: number) {
  const mins = Math.floor(Math.max(0, Date.now() - at) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function NetworkFeed() {
  const [you, setYou] = useState<NetworkYou | null>(null);
  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [recommended, setRecommended] = useState<NetworkPost[]>([]);
  const [people, setPeople] = useState<NetworkCard[]>([]);
  const [tab, setTab] = useState<FeedTab>("recent");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [needSignIn, setNeedSignIn] = useState(false);
  const [booted, setBooted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/network/feed");
    if (response.status === 401) {
      setNeedSignIn(true);
      return;
    }
    const data = (await response.json()) as {
      posts?: NetworkPost[];
      recommended?: NetworkPost[];
      people?: NetworkCard[];
      you?: NetworkYou;
      error?: string;
    };
    if (!response.ok) throw new Error(data.error || "Could not load feed");
    setNeedSignIn(false);
    setPosts(data.posts ?? []);
    setRecommended(data.recommended ?? []);
    setPeople(data.people ?? []);
    setYou(data.you ?? null);
  }

  useEffect(() => {
    void load()
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load"))
      .finally(() => setBooted(true));
    const id = window.setInterval(() => void load().catch(() => undefined), 12_000);
    return () => window.clearInterval(id);
  }, []);

  async function act(body: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/network/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        posts?: NetworkPost[];
        recommended?: NetworkPost[];
        people?: NetworkCard[];
        you?: NetworkYou;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not post");
      setPosts(data.posts ?? []);
      setRecommended(data.recommended ?? []);
      setPeople(data.people ?? []);
      if (data.you) setYou(data.you);
      if (body.action === "post") setDraft("");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function relate(action: string, username: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, username, tab: "pit" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not update");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  if (!booted) {
    return (
      <NetworkChrome>
        <p className="px-4 py-16 text-center text-zinc-400">Opening the wingâ€¦</p>
      </NetworkChrome>
    );
  }
  if (needSignIn) return <SignInGate />;

  const shown = tab === "recommended" ? recommended : posts;

  return (
    <NetworkChrome you={you}>
      <main className="li-main is-feed">
        <aside className="li-card li-side">
          <div className="li-cover" />
          <Avatar avatar={you?.avatar} username={you?.username ?? "you"} />
          <Link className="li-name" href={you ? `/network/u/${encodeURIComponent(you.username)}` : "/network"}>
            @{you?.username ?? "â€¦"}
          </Link>
          <p className="li-head">{you?.headline ?? "Huepot player"}</p>
        </aside>
        <section className="li-col">
          <form
            className="li-card li-compose"
            onSubmit={(event) => {
              event.preventDefault();
              void act({ action: "post", body: draft });
            }}
          >
            <Avatar avatar={you?.avatar} size="sm" username={you?.username ?? "you"} />
            <input
              className="field"
              maxLength={500}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Speak to the wing"
              value={draft}
            />
            <button className="chip-btn" disabled={busy || draft.trim().length < 2} type="submit">
              Post
            </button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className={`chip-btn ${tab === "recent" ? "" : "chip-btn-ghost"}`}
              onClick={() => setTab("recent")}
              type="button"
            >
              Recent
            </button>
            <button
              className={`chip-btn ${tab === "recommended" ? "" : "chip-btn-ghost"}`}
              onClick={() => setTab("recommended")}
              type="button"
            >
              Recommended
            </button>
          </div>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          {shown.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">
              {tab === "recommended"
                ? "No recommended lines yet. Recent words from the house land here."
                : "No lines yet. Anyone signed in can speak, and the wing hears it."}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {shown.map((post) => (
                <PostCard
                  busy={busy}
                  key={post.id}
                  onAct={act}
                  onRelate={relate}
                  post={post}
                  you={you?.username ?? ""}
                />
              ))}
            </ul>
          )}
        </section>
        <aside className="li-card li-suggest">
          <p className="lobby-label">In the pit</p>
          <p className="mt-2 text-xs text-zinc-500">Not in your company yet. Send an ask.</p>
          {people.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No other seats in the house yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {people.map((person) => (
                <li className="li-suggest-row" key={person.username}>
                  <Link
                    className="li-suggest-who"
                    href={`/network/u/${encodeURIComponent(person.username)}`}
                  >
                    <Avatar avatar={person.avatar} size="sm" username={person.username} />
                    <span>
                      <strong>@{person.username}</strong>
                      <em>{person.headline}</em>
                    </span>
                  </Link>
                  <RelateButton
                    busy={busy}
                    onRelate={relate}
                    relation={person.relation}
                    username={person.username}
                  />
                </li>
              ))}
            </ul>
          )}
          <Link className="li-more" href="/network/people">
            Show all
          </Link>
        </aside>
      </main>
    </NetworkChrome>
  );
}

function RelateButton({
  username,
  relation,
  busy,
  onRelate,
}: {
  username: string;
  relation: FriendRelation;
  busy: boolean;
  onRelate: (action: string, username: string) => void;
}) {
  if (relation === "outgoing") {
    return <span className="chip-btn chip-btn-ghost pointer-events-none">Ask sent</span>;
  }
  if (relation === "incoming") {
    return (
      <button
        className="chip-btn"
        disabled={busy}
        onClick={() => onRelate("accept", username)}
        type="button"
      >
        Accept
      </button>
    );
  }
  if (relation === "friends") return null;
  return (
    <button
      className="chip-btn"
      disabled={busy}
      onClick={() => onRelate("request", username)}
      type="button"
    >
      Ask
    </button>
  );
}

function PostCard({
  post,
  you,
  busy,
  onAct,
  onRelate,
}: {
  post: NetworkPost;
  you: string;
  busy: boolean;
  onAct: (body: Record<string, string>) => Promise<boolean>;
  onRelate: (action: string, username: string) => void;
}) {
  const [comment, setComment] = useState("");
  const own = post.username.toLowerCase() === you.toLowerCase();
  return (
    <li className="li-card li-post">
      <div className="li-post-top">
        <Avatar avatar={post.avatar} size="sm" username={post.username} />
        <div className="min-w-0 flex-1">
          <Link className="li-name" href={`/network/u/${encodeURIComponent(post.username)}`}>
            @{post.username}
          </Link>
          <p className="li-head">
            {post.headline}
            <span className="li-when"> Â· {whenLabel(post.createdAt)}</span>
          </p>
        </div>
        {own ? null : (
          <RelateButton busy={busy} onRelate={onRelate} relation={post.relation} username={post.username} />
        )}
      </div>
      <p className="li-body">{post.body}</p>
      <div className="li-actions">
        <button
          className={`chip-btn chip-btn-ghost ${post.liked ? "is-on" : ""}`}
          disabled={busy}
          onClick={() => onAct({ action: "like", postId: post.id })}
          type="button"
        >
          {post.liked ? "Liked" : "Like"} Â· {post.likes}
        </button>
      </div>
      {post.comments.length > 0 ? (
        <ul className="li-comments">
          {post.comments.map((item) => (
            <li key={item.id}>
              <Link href={`/network/u/${encodeURIComponent(item.username)}`}>@{item.username}</Link>
              {` ${item.body}`}
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="li-comment"
        onSubmit={(event) => {
          event.preventDefault();
          if (!comment.trim()) return;
          void onAct({ action: "comment", postId: post.id, body: comment }).then((ok) => {
            if (ok) setComment("");
          });
        }}
      >
        <input
          className="field"
          maxLength={240}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Add a comment"
          value={comment}
        />
      </form>
    </li>
  );
}
