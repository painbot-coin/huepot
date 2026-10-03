"use client";
import { HouseButton, HouseField } from "@/components/HouseUi";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { EveningWalk } from "@/components/EveningWalk";
import { NetworkChrome } from "@/components/NetworkChrome";
import { useCopy } from "@/components/LocaleRoot";
import { HOUSE_SEATS, seatLabel, seatTag } from "@/lib/house-seats";
import { spokenDay, spokenSeat } from "@/lib/house-tongue";
import { writerLabel } from "@/lib/line-writer";
import type { PublicProject } from "@/lib/seat-project-public";
import { newsHrefFromPost } from "@/lib/news-href";
import { houseCardKind } from "@/lib/take-talk";
import type { FriendRelation, NetworkCard, NetworkPost, NetworkYou } from "@/lib/types";

type FeedTab = "recent" | "recommended";

/** Posts fetched per step. Matches FEED_PAGE on the server. */
const FEED_STEP = 80;

function seatLine(person: NetworkCard) {
  if (person.why) return person.why;
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
  const { locale } = useCopy();
  const [you, setYou] = useState<NetworkYou | null>(null);
  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [recommended, setRecommended] = useState<NetworkPost[]>([]);
  const [people, setPeople] = useState<NetworkCard[]>([]);
  const [tab, setTab] = useState<FeedTab>("recent");
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState("");
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [booted, setBooted] = useState(false);
  const [busy, setBusy] = useState(false);
  // How deep the feed is currently read. The poll asks for the same depth, so
  // going further back is not undone twelve seconds later.
  const [depth, setDepth] = useState(FEED_STEP);
  const [total, setTotal] = useState(0);
  const [projects, setProjects] = useState<PublicProject[]>([]);

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
    if (data.you?.seat && !kind) setKind(data.you.seat);
    if (typeof data.total === "number") setTotal(data.total);
  }

  async function loadProjects() {
    const response = await fetch("/api/wait/projects");
    const data = (await response.json()) as { projects?: PublicProject[] };
    if (response.ok) setProjects(data.projects ?? []);
  }

  useEffect(() => {
    void load()
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load"))
      .finally(() => setBooted(true));
    void loadProjects().catch(() => undefined);
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
        <p className="px-4 py-16 text-center text-zinc-400">Opening seats…</p>
      </NetworkChrome>
    );
  }
  const signedIn = Boolean(you);
  const pool = tab === "recommended" ? recommended : posts;
  const shown = filter ? pool.filter((post) => post.kind === filter) : pool;
  const shownProjects = filter
    ? projects.filter((row) => row.seat === filter)
    : projects;

  return (
    <NetworkChrome you={you}>
      <main className="li-main is-feed">
        <section className="li-col">
          <EveningWalk />
          {signedIn ? (
            <form
              className="li-card li-compose is-stack"
              onSubmit={(event) => {
                event.preventDefault();
                void act({ action: "post", body: draft, kind: kind || you?.seat || "" });
              }}
            >
              <div className="li-compose-row">
                <Avatar avatar={you?.avatar} size="sm" username={you?.username ?? "you"} />
                <HouseField
                  inputProps={{ maxLength: 500 }}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Share a sit, a book, a take, or a project"
                  value={draft}
                />
              </div>
              <div className="li-compose-foot">
                <div className="li-kind-row" role="group" aria-label="Post seat">
                  {HOUSE_SEATS.map((row) => (
                    <button
                      className={`wait-tag ${kind === row.id ? "is-on" : ""}`}
                      key={row.id}
                      onClick={() => setKind(kind === row.id ? "" : row.id)}
                      type="button"
                    >
                      {spokenSeat(locale, row.id).tag}
                    </button>
                  ))}
                </div>
                <HouseButton disabled={busy || draft.trim().length < 2} type="submit">
                  Post
                </HouseButton>
              </div>
            </form>
          ) : (
            <p className="li-card li-compose">
              <HouseButton href="/signin?next=/network">
                Sign in to speak
              </HouseButton>
            </p>
          )}
          <div className="house-filters">
            <HouseButton ghost={tab !== "recent"} onClick={() => setTab("recent")}>
              Recent
            </HouseButton>
            <HouseButton ghost={tab !== "recommended"} onClick={() => setTab("recommended")}>
              Recommended
            </HouseButton>
            {HOUSE_SEATS.map((row) => (
              <HouseButton
                ghost={filter !== row.id}
                key={row.id}
                onClick={() => setFilter(filter === row.id ? "" : row.id)}
              >
                {spokenSeat(locale, row.id).tag}
              </HouseButton>
            ))}
          </div>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          {shown.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">
              {tab === "recommended"
                ? "No recommended lines yet. Recent words from the house land here."
                : filter
                  ? `No ${seatLabel(filter) || "seat"} lines yet.`
                  : "No posts yet. A seat can name a craft, or just be here."}
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
              <HouseButton
                disabled={busy}
                ghost
                onClick={() => setDepth((was) => was + FEED_STEP)}
              >
                Show older
              </HouseButton>
              <span className="li-deeper-n">
                {posts.length} of {total.toLocaleString()}
              </span>
            </div>
          ) : null}
          {tab === "recent" && total > 0 && total <= posts.length ? (
            <p className="li-deeper-n mt-3">
              That is everything the network holds — {total.toLocaleString()}{" "}
              {total === 1 ? "line" : "lines"}.
            </p>
          ) : null}
        </section>
        <aside className="house-discover">
          <section className="li-card li-board" aria-label="Projects on the shelf">
            <p className="lobby-label">Projects on the shelf</p>
            {shownProjects.length === 0 ? (
              <p className="li-suggest-empty">
                {filter
                  ? `No ${seatLabel(filter) || "seat"} projects yet.`
                  : "No projects on the shelf yet."}
              </p>
            ) : (
              <ul className="house-project-list">
                {shownProjects.slice(0, 4).map((row) => {
                  const house = row.username.toLowerCase() === "house";
                  return (
                  <li key={row.id}>
                    <Link href={house ? "/wait/store" : `/network/u/${encodeURIComponent(row.username)}`}>
                      <strong>{row.name}</strong>
                      <em>
                        {seatTag(row.seat)} · {house ? "The house" : `A seat · @${row.username}`} · {row.priceLabel}
                      </em>
                    </Link>
                  </li>
                  );
                })}
              </ul>
            )}
            <Link className="li-more" href="/wait/store">
              Open the store
            </Link>
          </section>
          <section className="li-card li-suggest">
          <p className="lobby-label">{signedIn ? "People like you" : "Playing now"}</p>
          <p className="li-suggest-lead">
            {signedIn
              ? "Same seat first — game, AI, play, or the pot. Then the same pit."
              : "Game developers, AI developers, gamers, and bettors."}
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
                      <em>
                        {person.seat ? `${seatTag(person.seat)} · ` : ""}
                        {seatLine(person)}
                      </em>
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
              <HouseButton href="/signin?next=/network">
                Sign in to ask
              </HouseButton>
              <Link className="li-more" href="/signin?next=/network/people">
                Show all
              </Link>
            </div>
          )}
          </section>
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
  const { locale } = useCopy();
  const [comment, setComment] = useState("");
  const [wantComment, setWantComment] = useState(Boolean(focused));
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
        {post.writer === "seat" ? (
          <Avatar avatar={post.avatar} size="sm" username={post.username} />
        ) : null}
        <div className="min-w-0 flex-1">
          {post.writer === "seat" ? (
            <Link className="li-name" href={`/network/u/${encodeURIComponent(post.username)}`}>
              {writerLabel("seat", post.username)}
            </Link>
          ) : (
            <span className="li-name">{writerLabel(post.writer, post.username)}</span>
          )}
          <p className="li-head">
            {seatTag(post.kind) ? <em className="seat-tag">{seatTag(post.kind)}</em> : null}
            {post.headline && post.headline !== writerLabel(post.writer) ? post.headline : null}
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
      ) : kind === "house" ? (
        <Link className="li-wire" href={post.link?.startsWith("/") ? post.link : "/"}>
          <span className="li-wire-text">
            <strong className="li-wire-title">{spokenDay(locale, post.title ?? "")?.title ?? post.title}</strong>
            {(spokenDay(locale, post.title ?? "")?.body ?? post.body) ? (
              <span className="li-body">{spokenDay(locale, post.title ?? "")?.body ?? post.body}</span>
            ) : null}
            <span className="li-wire-src">{post.source || "Huepot"}</span>
          </span>
        </Link>
      ) : kind === "wire" ? (
        <Link
          className="li-wire"
          href={newsHrefFromPost(post.id, post.link) || "/news"}
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
        </Link>
      ) : (
        <p className="li-body">{post.body}</p>
      )}
      <div className="li-actions is-bar">
        {signedIn ? (
          <button
            className={post.liked ? "is-on" : ""}
            disabled={busy}
            onClick={() => onAct({ action: "like", postId: post.id })}
            type="button"
          >
            {post.liked ? "Liked" : "Like"} · {post.likes}
          </button>
        ) : (
          <Link href="/signin?next=/network">Like · {post.likes}</Link>
        )}
        {signedIn ? (
          <button onClick={() => setWantComment(true)} type="button">
            Comment{post.comments.length ? ` · ${post.comments.length}` : ""}
          </button>
        ) : (
          <Link href="/signin?next=/network">
            Comment{post.comments.length ? ` · ${post.comments.length}` : ""}
          </Link>
        )}
        {signedIn && own ? (
          <button
            disabled={busy}
            onClick={() => {
              if (!window.confirm("Delete this post? It does not come back.")) return;
              void onAct({ action: "delete-post", postId: post.id });
            }}
            type="button"
          >
            Delete
          </button>
        ) : signedIn && !own ? (
          <button
            disabled={busy}
            onClick={() => {
              if (!window.confirm("Report this to the house?")) return;
              void onAct({ action: "report-post", postId: post.id });
            }}
            type="button"
          >
            Report
          </button>
        ) : (
          <Link href="/signin?next=/network">Ask</Link>
        )}
      </div>
      {post.comments.length > 0 ? (
        <ul className="li-comments">
          {post.comments.map((item) => {
            const mine = item.username.toLowerCase() === you.toLowerCase();
            return (
              <li key={item.id}>
                {item.writer === "seat" ? (
                  <Link href={`/network/u/${encodeURIComponent(item.username)}`}>
                    {writerLabel("seat", item.username)}
                  </Link>
                ) : (
                  <span>{writerLabel(item.writer, item.username)}</span>
                )}
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
      {signedIn && (wantComment || focused || comment) ? (
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
          <HouseField
            autoFocus={wantComment || focused}
            inputProps={{ maxLength: 240 }}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add a comment"
            value={comment}
          />
        </form>
      ) : signedIn ? null : (
        <p className="li-comment">
          <Link href="/signin?next=/network">Sign in to comment</Link>
        </p>
      )}
    </li>
  );
}
