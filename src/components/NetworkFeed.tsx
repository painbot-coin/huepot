"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { NetworkChrome } from "@/components/NetworkChrome";
import { houseCardKind } from "@/lib/take-talk";
import type { FriendRelation, NetworkCard, NetworkPost, NetworkYou } from "@/lib/types";

type FeedTab = "recent" | "recommended";

/** Posts fetched per step. Matches FEED_PAGE on the server. */
const FEED_STEP = 80;

function seatLine(person: NetworkCard) {
  if (person.room) return `Sitting ${person.room.name}`;
  if (person.online) return "In the house";
  return person.headline || "Huepot player";
}

function whenLabel(at: number) {
  const mins = Math.floor(Math.max(0, Date.now() - at) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function NetworkFeed({ focusPost = "" }: { focusPost?: string }) {
  const [you, setYou] = useState<NetworkYou | null>(null);
  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [recommended, setRecommended] = useState<NetworkPost[]>([]);
  const [people, setPeople] = useState<NetworkCard[]>([]);
  const [tab, setTab] = useState<FeedTab>("recent");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [booted, setBooted] = useState(false);
  const [busy, setBusy] = useState(false);
  // How deep the feed is currently read. The poll asks for the same depth, so
  // going further back is not undone twelve seconds later.
  const [depth, setDepth] = useState(FEED_STEP);
  const [total, setTotal] = useState(0);

  async function load(want = depth) {
    const query = new URLSearchParams({ limit: String(want) });
    if (focusPost) query.set("post", focusPost);
    const response = await fetch(`/api/network/feed?${query.toString()}`);
    const data = (await response.json()) as {
      posts?: NetworkPost[];
      recommended?: NetworkPost[];
      people?: NetworkCard[];
      you?: NetworkYou;
      total?: number;
      error?: string;
    };
    if (!response.ok) throw new Error(data.error || "Could not load feed");
    setPosts(data.posts ?? []);
    setRecommended(data.recommended ?? []);
    setPeople(data.people ?? []);
    setYou(data.you ?? null);
    if (typeof data.total === "number") setTotal(data.total);
  }

  useEffect(() => {
    void load()
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load"))
      .finally(() => setBooted(true));
    const id = window.setInterval(() => void load().catch(() => undefined), 12_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depth, focusPost]);

  async function act(body: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/network/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, limit: depth }),
      });
      const data = (await response.json()) as {
        posts?: NetworkPost[];
        recommended?: NetworkPost[];
        people?: NetworkCard[];
        you?: NetworkYou;
        total?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not post");
      if (typeof data.total === "number") setTotal(data.total);
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

  useEffect(() => {
    if (!booted || !focusPost) return;
    const el = document.getElementById(`post-${focusPost}`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [booted, focusPost, posts]);

  if (!booted) {
    return (
      <NetworkChrome>
        <p className="px-4 py-16 text-center text-zinc-400">Opening the wing…</p>
      </NetworkChrome>
    );
  }
  const shown = tab === "recommended" ? recommended : posts;
  const signedIn = Boolean(you);

  return (
    <NetworkChrome you={you}>
      <main className="li-main is-feed">
        <aside className="li-card li-side">
          <div className="li-cover" />
          {you ? (
            <>
              <Avatar avatar={you.avatar} username={you.username} />
              <Link className="li-name" href={`/network/u/${encodeURIComponent(you.username)}`}>
                @{you.username}
              </Link>
              <p className="li-head">{you.headline}</p>
            </>
          ) : (
            <>
              <p className="hall-kicker">The wing</p>
              <p className="li-head">Takes and talk. Sign in to speak.</p>
              <Link className="chip-btn mt-3" href="/signin?next=/network">
                Sign in
              </Link>
            </>
          )}
        </aside>
        <section className="li-col">
          {signedIn ? (
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
          ) : (
            <p className="li-card li-compose">
              <Link className="chip-btn" href="/signin?next=/network">
                Sign in to speak
              </Link>
            </p>
          )}
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
                  focused={post.id === focusPost}
                  key={post.id}
                  onAct={act}
                  onRelate={relate}
                  post={post}
                  signedIn={signedIn}
                  you={you?.username ?? ""}
                />
              ))}
            </ul>
          )}
          {/* Only offered when going deeper would actually find something, so
              the control never promises more and then delivers the same. */}
          {tab === "recent" && total > posts.length ? (
            <div className="li-deeper">
              <button
                className="chip-btn chip-btn-ghost"
                disabled={busy}
                onClick={() => setDepth((was) => was + FEED_STEP)}
                type="button"
              >
                Show older
              </button>
              <span className="li-deeper-n">
                {posts.length} of {total.toLocaleString()}
              </span>
            </div>
          ) : null}
          {tab === "recent" && total > 0 && total <= posts.length ? (
            <p className="li-deeper-n mt-3">
              That is everything the wing holds — {total.toLocaleString()}{" "}
              {total === 1 ? "line" : "lines"}.
            </p>
          ) : null}
        </section>
        <aside className="li-card li-suggest">
          <p className="lobby-label">In the pit</p>
          <p className="li-suggest-lead">
            {signedIn ? "Not in your company yet. Send an ask." : "Seats in the house."}
          </p>
          {people.length === 0 ? (
            <p className="li-suggest-empty">No other seats in the house yet.</p>
          ) : (
            <ul className="li-suggest-list">
              {people.map((person) => (
                <li className="li-suggest-row" key={person.username}>
                  <Link
                    className="li-suggest-who"
                    href={`/network/u/${encodeURIComponent(person.username)}`}
                  >
                    <Avatar avatar={person.avatar} size="sm" username={person.username} />
                    <span className="li-suggest-copy">
                      <strong>@{person.username}</strong>
                      <em>{seatLine(person)}</em>
                    </span>
                  </Link>
                  {signedIn ? (
                    <RelateButton
                      busy={busy}
                      onRelate={relate}
                      relation={person.relation}
                      signedIn
                      tone="ask"
                      username={person.username}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {signedIn ? (
            <Link className="li-more" href="/network/people">
              Show all
            </Link>
          ) : (
            <div className="li-suggest-foot">
              <Link className="chip-btn" href="/signin?next=/network">
                Sign in to ask
              </Link>
              <Link className="li-more" href="/signin?next=/network/people">
                Show all
              </Link>
            </div>
          )}
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
  signedIn = true,
  tone = "chip",
}: {
  username: string;
  relation: FriendRelation;
  busy: boolean;
  onRelate: (action: string, username: string) => void;
  signedIn?: boolean;
  tone?: "chip" | "ask";
}) {
  const ask = tone === "ask";
  const btn = ask ? "li-ask" : "chip-btn";
  const sent = ask ? "li-ask is-sent" : "chip-btn chip-btn-ghost pointer-events-none";
  if (!signedIn) {
    return (
      <Link
        className={ask ? "li-ask" : "chip-btn"}
        href={`/signin?next=${encodeURIComponent(`/network/u/${username}`)}`}
      >
        {ask ? "Ask" : "Sign in to ask"}
      </Link>
    );
  }
  if (relation === "outgoing") {
    return (
      <span className={sent} aria-disabled="true">
        {ask ? "Sent" : "Ask sent"}
      </span>
    );
  }
  if (relation === "incoming") {
    return (
      <button
        className={btn}
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
      className={btn}
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
  focused,
  onAct,
  onRelate,
  signedIn,
}: {
  post: NetworkPost;
  you: string;
  busy: boolean;
  focused?: boolean;
  onAct: (body: Record<string, string>) => Promise<boolean>;
  onRelate: (action: string, username: string) => void;
  signedIn: boolean;
}) {
  const [comment, setComment] = useState("");
  const own = post.username.toLowerCase() === you.toLowerCase();
  const kind = houseCardKind(post.link ?? "");
  const houseCard = Boolean(kind);
  const takeHref = post.link || "/board";
  return (
    <li
      className={`li-card li-post ${houseCard ? "is-wire" : ""} ${kind === "take" ? "is-take-card" : ""} ${focused ? "is-focus" : ""}`}
      id={`post-${post.id}`}
    >
      <div className="li-post-top">
        <Avatar avatar={post.avatar} size="sm" username={post.username} />
        <div className="min-w-0 flex-1">
          <Link className="li-name" href={`/network/u/${encodeURIComponent(post.username)}`}>
            @{post.username}
          </Link>
          <p className="li-head">
            {post.headline}
            <span className="li-when"> · {whenLabel(post.createdAt)}</span>
          </p>
        </div>
        {own || houseCard || !signedIn ? null : (
          <RelateButton
            busy={busy}
            onRelate={onRelate}
            relation={post.relation}
            signedIn
            tone="ask"
            username={post.username}
          />
        )}
      </div>
      {kind === "take" ? (
        <Link className="li-wire" href={takeHref}>
          <span className="li-wire-text">
            <strong className="li-wire-title">{post.title}</strong>
            {post.body ? <span className="li-body">{post.body}</span> : null}
            <span className="li-wire-src">{post.source}</span>
          </span>
        </Link>
      ) : kind === "wire" ? (
        <a
          className="li-wire"
          href={post.link}
          rel="noopener noreferrer nofollow"
          target="_blank"
        >
          {post.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="li-wire-shot"
              loading="lazy"
              referrerPolicy="no-referrer"
              src={post.image}
            />
          ) : null}
          <span className="li-wire-text">
            <strong className="li-wire-title">{post.title}</strong>
            {post.body ? <span className="li-body">{post.body}</span> : null}
            <span className="li-wire-src">{post.source}</span>
          </span>
        </a>
      ) : (
        <p className="li-body">{post.body}</p>
      )}
      <div className="li-actions">
        {signedIn ? (
          <button
            className={`chip-btn chip-btn-ghost ${post.liked ? "is-on" : ""}`}
            disabled={busy}
            onClick={() => onAct({ action: "like", postId: post.id })}
            type="button"
          >
            {post.liked ? "Liked" : "Like"} · {post.likes}
          </button>
        ) : (
          <Link className="chip-btn chip-btn-ghost" href="/signin?next=/network">
            Like · {post.likes}
          </Link>
        )}
        {signedIn && own ? (
          <button
            className="chip-btn chip-btn-ghost"
            disabled={busy}
            onClick={() => {
              if (!window.confirm("Delete this post? It does not come back.")) return;
              void onAct({ action: "delete-post", postId: post.id });
            }}
            type="button"
          >
            Delete
          </button>
        ) : null}
        {signedIn && !own ? (
          <button
            className="chip-btn chip-btn-ghost"
            disabled={busy}
            onClick={() => {
              if (!window.confirm("Report this to the house?")) return;
              void onAct({ action: "report-post", postId: post.id });
            }}
            type="button"
          >
            Report
          </button>
        ) : null}
      </div>
      {post.comments.length > 0 ? (
        <ul className="li-comments">
          {post.comments.map((item) => {
            const mine = item.username.toLowerCase() === you.toLowerCase();
            return (
              <li key={item.id}>
                <Link href={`/network/u/${encodeURIComponent(item.username)}`}>@{item.username}</Link>
                {` ${item.body} `}
                {/* The post's owner can clear their own thread, which is why
                    this shows for a comment that is not yours on your post. */}
                {signedIn && (mine || own) ? (
                  <button
                    className="li-tiny"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm("Remove this comment?")) return;
                      void onAct({ action: "delete-comment", commentId: item.id });
                    }}
                    type="button"
                  >
                    remove
                  </button>
                ) : null}
                {signedIn && !mine && !own ? (
                  <button
                    className="li-tiny"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm("Report this comment to the house?")) return;
                      void onAct({ action: "report-comment", commentId: item.id });
                    }}
                    type="button"
                  >
                    report
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {signedIn ? (
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
            autoFocus={focused}
            className="field"
            maxLength={240}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add a comment"
            value={comment}
          />
        </form>
      ) : (
        <p className="li-comment">
          <Link href="/signin?next=/network">Sign in to comment</Link>
        </p>
      )}
    </li>
  );
}
